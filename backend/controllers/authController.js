import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/userModel.js";
import admin from "../config/firebaseAdmin.js";


export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Create in Firebase too
    const fbUser = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      firebaseUid: fbUser.uid,
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.status(201).json({ token, user });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// -------------------- EMAIL + PASSWORD LOGIN --------------------
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.status(200).json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -------------------- GOOGLE LOGIN --------------------
export const googleLogin = async (req, res) => {
  try {
    const { token } = req.body; // frontend sends Firebase ID token
    const decoded = await admin.auth().verifyIdToken(token);
    const { uid, email, name, picture } = decoded;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        firebaseUid: uid,
        name: name || email.split("@")[0],
        email,
        photoURL: picture,
      });
      console.log("🆕 Google user added to DB:", user.email);
    } else {
      // ✅ Update profile image if changed
      if (picture && user.photoURL !== picture) {
        user.photoURL = picture;
        await user.save();
      }
    }

    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.status(200).json({ token: jwtToken, user });
  } catch (err) {
    console.error("Google Login Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// -------------------- FORGOT PASSWORD --------------------
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found with this email" });
    }

    // Generate token
    const rawToken = crypto.randomBytes(20).toString("hex");
    
    // Set fields
    user.resetPasswordToken = rawToken;
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
    await user.save();

    // Since we are running in local/test without a real SMTP, we return the token
    // and a mock link in the payload for absolute seamless testing
    const resetUrl = `http://localhost:3000/reset-password?token=${rawToken}`;
    
    res.status(200).json({
      message: "Reset token generated successfully",
      token: rawToken,
      resetUrl,
    });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// -------------------- RESET PASSWORD --------------------
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: "Token and password are required" });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Password reset token is invalid or has expired." });
    }

    // Hash and save in MongoDB
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    // Synchronize with Firebase Auth if firebaseUid is present
    if (user.firebaseUid) {
      try {
        await admin.auth().updateUser(user.firebaseUid, {
          password: password,
        });
        console.log(`✅ Synced password update to Firebase for UID: ${user.firebaseUid}`);
      } catch (fbErr) {
        console.error("⚠️ Failed to update password in Firebase Auth:", fbErr.message);
      }
    }

    res.status(200).json({ message: "Password has been successfully reset!" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ message: err.message });
  }
};
