import User from "../models/userModel.js";
import Group from "../models/groupModel.js";
import Expense from "../models/expenseModel.js";
import ContactMessage from "../models/contactMessageModel.js";
import BlogPost from "../models/blogPostModel.js";
import JobPosting from "../models/jobPostingModel.js";
import JobApplication from "../models/jobApplicationModel.js";

const MESSAGE_STATUSES = ["new", "read", "resolved"];
const APPLICATION_STATUSES = ["new", "reviewed", "shortlisted", "rejected", "hired"];

// Turns [{ _id: "new", count: 3 }, ...] into { new: 3, read: 0, resolved: 0 }
// with every known status present, even at zero, so the UI never has to guess.
const fillCounts = (rows, statuses) => {
  const map = Object.fromEntries(statuses.map((s) => [s, 0]));
  rows.forEach((r) => { map[r._id] = r.count; });
  return map;
};

export const getAdminStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalGroups,
      totalExpenses,
      totalMessages,
      messageStatusRows,
      totalBlogPosts,
      publishedPosts,
      totalJobs,
      openJobs,
      totalApplications,
      applicationStatusRows,
      recentMessages,
      recentApplications,
    ] = await Promise.all([
      User.countDocuments(),
      Group.countDocuments(),
      Expense.countDocuments(),
      ContactMessage.countDocuments(),
      ContactMessage.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      BlogPost.countDocuments(),
      BlogPost.countDocuments({ published: true }),
      JobPosting.countDocuments(),
      JobPosting.countDocuments({ status: "open" }),
      JobApplication.countDocuments(),
      JobApplication.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      ContactMessage.find().sort({ createdAt: -1 }).limit(5),
      JobApplication.find().sort({ createdAt: -1 }).limit(5).populate("job", "title"),
    ]);

    const messagesByStatus = fillCounts(messageStatusRows, MESSAGE_STATUSES);
    const applicationsByStatus = fillCounts(applicationStatusRows, APPLICATION_STATUSES);

    res.json({
      totalUsers,
      totalGroups,
      totalExpenses,
      totalMessages,
      newMessages: messagesByStatus.new,
      messagesByStatus,
      totalBlogPosts,
      publishedPosts,
      draftPosts: totalBlogPosts - publishedPosts,
      totalJobs,
      openJobs,
      closedJobs: totalJobs - openJobs,
      totalApplications,
      applicationsByStatus,
      recentMessages,
      recentApplications,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
