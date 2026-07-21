import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Admin from "../models/adminModel.js";

// No isValidEmail() check here on purpose - the admin login is not a real
// email address, it's a fixed credential string, so the format is whatever
// was seeded in the DB.
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const admin = await Admin.findOne({ email: email.trim().toLowerCase() });
    if (!admin) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { adminId: admin._id.toString(), email: admin.email, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    res.status(200).json({ token, email: admin.email });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
