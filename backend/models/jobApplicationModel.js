import mongoose from "mongoose";

const jobApplicationSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: "JobPosting", required: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true, default: "" },
  resumeLink: { type: String, required: true, trim: true },
  coverNote: { type: String, trim: true, default: "" },
  status: {
    type: String,
    enum: ["new", "reviewed", "shortlisted", "rejected", "hired"],
    default: "new",
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("JobApplication", jobApplicationSchema);
