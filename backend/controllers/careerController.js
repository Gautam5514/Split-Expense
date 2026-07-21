import JobPosting from "../models/jobPostingModel.js";
import JobApplication from "../models/jobApplicationModel.js";
import { isValidEmail, isValidObjectId } from "../middleware/validate.js";

// -------------------- PUBLIC --------------------
export const listOpenJobs = async (req, res) => {
  try {
    const jobs = await JobPosting.find({ status: "open" }).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getOpenJobById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(404).json({ message: "Job not found" });
    const job = await JobPosting.findOne({ _id: id, status: "open" });
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json(job);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const applyToJob = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(404).json({ message: "Job not found" });

    const job = await JobPosting.findOne({ _id: id, status: "open" });
    if (!job) return res.status(404).json({ message: "This role is no longer accepting applications." });

    const { name, email, phone, resumeLink, coverNote } = req.body;
    if (!name?.trim() || name.trim().length < 2)
      return res.status(400).json({ field: "name", message: "Name must be at least 2 characters." });
    if (!isValidEmail(email))
      return res.status(400).json({ field: "email", message: "Please enter a valid email address." });
    if (!resumeLink?.trim())
      return res.status(400).json({ field: "resumeLink", message: "Add a link to your resume or portfolio." });

    const application = await JobApplication.create({
      job: job._id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || "",
      resumeLink: resumeLink.trim(),
      coverNote: coverNote?.trim() || "",
    });

    res.status(201).json({ id: application._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -------------------- ADMIN: JOBS --------------------
export const listAllJobs = async (req, res) => {
  try {
    const jobs = await JobPosting.find().sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const buildJobFields = (body) => ({
  title: body.title?.trim(),
  department: body.department?.trim(),
  location: body.location?.trim(),
  type: ["Full-time", "Part-time", "Internship", "Contract"].includes(body.type) ? body.type : "Full-time",
  description: body.description?.trim(),
  responsibilities: Array.isArray(body.responsibilities) ? body.responsibilities.filter(Boolean) : [],
  requirements: Array.isArray(body.requirements) ? body.requirements.filter(Boolean) : [],
  status: body.status === "closed" ? "closed" : "open",
});

export const createJob = async (req, res) => {
  try {
    if (!req.body.title?.trim())
      return res.status(400).json({ field: "title", message: "Title is required." });
    if (!req.body.department?.trim())
      return res.status(400).json({ field: "department", message: "Department is required." });
    if (!req.body.location?.trim())
      return res.status(400).json({ field: "location", message: "Location is required." });
    if (!req.body.description?.trim())
      return res.status(400).json({ field: "description", message: "Description is required." });

    const job = await JobPosting.create(buildJobFields(req.body));
    res.status(201).json(job);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid id" });

    const updated = await JobPosting.findByIdAndUpdate(id, buildJobFields(req.body), { new: true });
    if (!updated) return res.status(404).json({ message: "Job not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid id" });

    const deleted = await JobPosting.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Job not found" });
    await JobApplication.deleteMany({ job: id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -------------------- ADMIN: APPLICATIONS --------------------
export const listApplications = async (req, res) => {
  try {
    const filter = {};
    if (req.query.jobId) {
      if (!isValidObjectId(req.query.jobId)) return res.status(400).json({ message: "Invalid jobId" });
      filter.job = req.query.jobId;
    }
    const applications = await JobApplication.find(filter)
      .populate("job", "title department location")
      .sort({ createdAt: -1 });
    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid id" });
    if (!["new", "reviewed", "shortlisted", "rejected", "hired"].includes(status))
      return res.status(400).json({ message: "Invalid status" });

    const updated = await JobApplication.findByIdAndUpdate(id, { status }, { new: true });
    if (!updated) return res.status(404).json({ message: "Application not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
