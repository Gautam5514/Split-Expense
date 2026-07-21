import mongoose from "mongoose";

const jobPostingSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  department: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ["Full-time", "Part-time", "Internship", "Contract"],
    default: "Full-time",
  },
  description: { type: String, required: true, trim: true },
  responsibilities: [{ type: String }],
  requirements: [{ type: String }],
  status: { type: String, enum: ["open", "closed"], default: "open" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("JobPosting", jobPostingSchema);
