import cloudinary from "../config/cloudinary.js";
import UserProfile from "../models/userProfileModel.js";
import User from "../models/userModel.js";
import Group from "../models/groupModel.js";
import admin from "../config/firebaseAdmin.js";

// ✅ GET /api/profile
export const getProfile = async (req, res) => {
  try {
    const baseUser = await User.findById(req.user.id).select("name email");
    const extraProfile = await UserProfile.findOne({ userId: req.user.id });

    // merge both but do not overwrite base user fields
    const combinedProfile = {
      userId: req.user.id,
      name: baseUser?.name,
      email: baseUser?.email,
      ...(extraProfile ? extraProfile.toObject() : {}),
    };

    res.json(combinedProfile);
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ message: "Error fetching profile" });
  }
};

// ✅ PUT /api/profile
export const updateProfile = async (req, res) => {
  try {
    const { name, email: _email, ...rest } = req.body;

    // Update name on the base User model if provided
    if (name && name.trim()) {
      await User.findByIdAndUpdate(req.user.id, { name: name.trim() });
    }

    const profile = await UserProfile.findOneAndUpdate(
      { userId: req.user.id },
      { ...rest, userId: req.user.id },
      { new: true, upsert: true }
    );

    const baseUser = await User.findById(req.user.id).select("name email");
    res.json({
      ...profile.toObject(),
      name: baseUser?.name,
      email: baseUser?.email,
    });
  } catch (err) {
    console.error("Error saving profile:", err);
    res.status(500).json({ message: "Error saving profile" });
  }
};

export const uploadProfileImage = async (req, res) => {
  try {
    const { file } = req.body; // base64 string from frontend
    if (!file) {
      return res.status(400).json({ message: "No file received" });
    }

    // find existing profile
    const existing = await UserProfile.findOne({ userId: req.user.id });

    // delete old image if any
    if (existing?.profileImage?.public_id) {
      await cloudinary.uploader.destroy(existing.profileImage.public_id);
    }

    // upload new image
    const result = await cloudinary.uploader.upload(file, {
      folder: "splitwise_profile_images",
      resource_type: "image",
    });

    const updated = await UserProfile.findOneAndUpdate(
      { userId: req.user.id },
      {
        userId: req.user.id,
        profileImage: {
          url: result.secure_url,
          public_id: result.public_id,
        },
      },
      { new: true, upsert: true }
    );

    res.json({
      message: "Profile image updated successfully",
      profileImage: updated.profileImage,
    });
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
};

// ✅ DELETE /api/profile/account
export const deleteAccount = async (req, res) => {
  try {
    const uid = req.user.id;
    const firebaseUid = req.user.firebaseUid;

    // Remove user from all groups (as member)
    await Group.updateMany({ members: uid }, { $pull: { members: uid } });

    // Delete groups the user created
    await Group.deleteMany({ createdBy: uid });

    // Delete profile image from Cloudinary if exists
    const profile = await UserProfile.findOne({ userId: uid });
    if (profile?.profileImage?.public_id) {
      await cloudinary.uploader.destroy(profile.profileImage.public_id).catch(() => {});
    }

    // Delete UserProfile and User records
    await UserProfile.deleteOne({ userId: uid });
    await User.deleteOne({ _id: uid });

    // Delete from Firebase Auth if we have the Firebase UID
    if (firebaseUid) {
      await admin.auth().deleteUser(firebaseUid).catch(() => {});
    }

    res.json({ success: true, message: "Account permanently deleted" });
  } catch (err) {
    console.error("deleteAccount error:", err);
    res.status(500).json({ message: "Failed to delete account" });
  }
};
