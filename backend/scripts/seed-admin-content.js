import "dotenv/config";
import mongoose from "mongoose";
import BlogPost from "../models/blogPostModel.js";
import JobPosting from "../models/jobPostingModel.js";
import ContactMessage from "../models/contactMessageModel.js";

// Sample content so the admin panel isn't empty during a demo/test pass.
// Safe to re-run - upserts by slug/title instead of duplicating.
if (!process.env.MONGO_URI) {
  console.error("Seed failed: MONGO_URI is not configured.");
  process.exitCode = 1;
} else {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    await JobPosting.findOneAndUpdate(
      { title: "Frontend Engineer" },
      {
        $set: {
          title: "Frontend Engineer",
          department: "Engineering",
          location: "Remote",
          type: "Full-time",
          description:
            "Build the interfaces people use to split bills with friends without an argument. You'll own features end to end across our Next.js app.",
          responsibilities: [
            "Ship user-facing features in the Next.js/React app",
            "Work closely with design to keep the product feeling premium",
            "Improve performance and accessibility across the app",
          ],
          requirements: [
            "2+ years with React or a similar framework",
            "Comfortable with Tailwind CSS and component-driven UI",
            "Bonus: experience with Node/Express backends",
          ],
          status: "open",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await BlogPost.findOneAndUpdate(
      { slug: "5-signs-your-group-needs-an-expense-app" },
      {
        $set: {
          slug: "5-signs-your-group-needs-an-expense-app",
          category: "Guides",
          title: "5 Signs Your Group Needs an Expense App",
          description:
            "If your group chat has ever had a 'wait, who paid for what' moment, these five signs will feel painfully familiar.",
          readTime: "4 min read",
          cover: {
            image: "/blog/friends-split-dinner.png",
            alt: "Friends reviewing a shared bill together",
            c1: "#0891B2",
            c2: "#0EA5E9",
          },
          intro: [
            "Every group has that one moment - the bill arrives, five phones come out, and nobody agrees on the math.",
            "Here's how to tell your group has outgrown mental math and group-chat IOUs.",
          ],
          sections: [
            {
              h2: "1. Someone always fronts the big payments",
              p: ["One person's card ends up covering the hotel, the cab, and dinner - and remembering it all after the fact never works."],
              list: [],
            },
            {
              h2: "2. Debts get forgotten, not forgiven",
              p: ["Small amounts pile up quietly until nobody's sure what's actually still owed."],
              list: [],
            },
          ],
          faqs: [
            { q: "Is SplitEase free?", a: "Yes - unlimited groups and expenses, no credit card required." },
          ],
          published: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await BlogPost.findOneAndUpdate(
      { slug: "settling-up-without-the-awkward-conversation" },
      {
        $set: {
          slug: "settling-up-without-the-awkward-conversation",
          category: "Tips",
          title: "Settling Up Without the Awkward Conversation",
          description:
            "Nobody likes asking for money back. Here's how to make settling up feel completely normal.",
          readTime: "3 min read",
          cover: {
            image: "/blog/roommates-rent.png",
            alt: "Two roommates settling a shared expense on their phones",
            c1: "#10B981",
            c2: "#34D399",
          },
          intro: [
            "The awkward part was never the money - it was having to bring it up.",
            "A shared, visible balance removes the ask entirely.",
          ],
          sections: [
            {
              h2: "Make the balance visible, not personal",
              p: ["When everyone can see the same numbers, settling up stops being a request and starts being a formality."],
              list: [],
            },
          ],
          faqs: [
            { q: "How does SplitEase suggest payments?", a: "It nets every balance in the group and suggests the fewest possible transfers to settle everyone up." },
          ],
          published: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await ContactMessage.create({
      name: "Aarav Mehta",
      email: "aarav.mehta@example.com",
      message:
        "Hey team, loving SplitEase so far! Quick question - is there a way to export a group's expense history as a PDF before we settle up? Would be great for our trip records.",
      status: "new",
    });

    console.log("Seeded: 1 job posting, 2 blog posts, 1 contact message.");
  } catch (error) {
    console.error(`Seed failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
