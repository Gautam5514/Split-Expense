import JobPosting from "../models/jobPostingModel.js";
import JobApplication from "../models/jobApplicationModel.js";
import { isValidEmail, isValidObjectId, isHttpUrl, normalizeEmail, optionalString } from "../middleware/validate.js";

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

    const { name, email, resumeLink } = req.body;
    if (typeof name !== "string" || name.trim().length < 2)
      return res.status(400).json({ field: "name", message: "Name must be at least 2 characters." });
    if (name.trim().length > 200)
      return res.status(400).json({ field: "name", message: "Name must be under 200 characters." });
    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail) || normalizedEmail.length > 254)
      return res.status(400).json({ field: "email", message: "Please enter a valid email address." });
    const phone = optionalString(req.body.phone, 50);
    if (!phone.ok)
      return res.status(400).json({ field: "phone", message: "Phone number looks too long." });
    if (typeof resumeLink !== "string" || !resumeLink.trim())
      return res.status(400).json({ field: "resumeLink", message: "Add a link to your resume or portfolio." });
    // The admin panel renders this as <a href>. A `javascript:` (or `data:`)
    // value would execute in the admin's session when clicked - stored XSS
    // against the most privileged account - so only http(s) links are allowed.
    // Bare "linkedin.com/in/x" is fine - assume https when no scheme is given.
    const rawLink = resumeLink.trim();
    const link = /^[a-z][a-z0-9+.-]*:/i.test(rawLink) ? rawLink : `https://${rawLink}`;
    if (!isHttpUrl(link))
      return res.status(400).json({ field: "resumeLink", message: "Please enter a valid http(s) link." });
    const coverNote = optionalString(req.body.coverNote, 20000);
    if (!coverNote.ok)
      return res.status(400).json({ field: "coverNote", message: "Cover note must be under 20000 characters." });

    const application = await JobApplication.create({
      job: job._id,
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.value,
      resumeLink: link,
      coverNote: coverNote.value,
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
