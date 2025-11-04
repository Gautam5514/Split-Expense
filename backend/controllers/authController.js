import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
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
