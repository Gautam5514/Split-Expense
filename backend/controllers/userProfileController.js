import cloudinary from "../config/cloudinary.js";
import { invalidateAuthCache } from "../utils/authCache.js";
import UserProfile from "../models/userProfileModel.js";
import User from "../models/userModel.js";
import Group from "../models/groupModel.js";
import admin from "../config/firebaseAdmin.js";
import { checkAndQualifyMilestones, cancelPendingReferralFor } from "../utils/referralService.js";
import { uploadRejectionReason, IMAGE_MIME_TYPES } from "../utils/uploadSecurity.js";

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
    res.status(500).json({ message: "Error fetching profile", expose: true });
  }
};

// Only these UserProfile fields may be written by the client, each with a
// max length. Previously the whole request body was spread into the update,
// so a client could overwrite `profileImage` (e.g. point `public_id` at
// another user's Cloudinary asset, which the next avatar upload then deletes),
// `createdAt`, or anything else. Unknown keys (_id, userId, email, name,
// profileImage, __v...) that clients echo back from GET /profile are ignored.
const PROFILE_STRING_FIELDS = {
  mobile: 50,
  address: 1000,
  city: 200,
  state: 200,
  favoritePlace: 200,
  upiId: 100,
  profession: 200,
  timezone: 100,
  bio: 5000,
};
const MAX_INTERESTS = 50;
// VPA shape: handle@provider (handle: letters, digits, . _ -)
export const UPI_ID_RE = /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z][a-zA-Z0-9.]{1,63}$/;
const MAX_INTEREST_LENGTH = 100;

/**
 * Builds the $set for a profile update. `existing` is the stored profile:
 * a value identical to what's already saved is always accepted, so users with
 * data saved before these limits existed can still save the form (clients
 * send back every field, edited or not).
 */
export const buildProfileUpdate = (body = {}, existing = {}) => {
  const update = {};
  for (const [field, max] of Object.entries(PROFILE_STRING_FIELDS)) {
    if (body[field] === undefined) continue;
    let value = body[field] === null ? "" : body[field];
    if (typeof value === "number" || typeof value === "boolean") value = String(value);
    if (typeof value !== "string") return { error: `${field} must be text.`, field };
    const trimmed = value.trim();
    const unchanged = trimmed === String(existing?.[field] ?? "").trim();
    if (trimmed.length > max && !unchanged)
      return { error: `${field} must be under ${max} characters.`, field };
    if (field === "upiId" && trimmed && !unchanged && !UPI_ID_RE.test(trimmed))
      return { error: "Enter a valid UPI ID, e.g. name@okaxis.", field };
    update[field] = trimmed;
  }
  if (body.interests !== undefined && body.interests !== null) {
    const list = typeof body.interests === "string" ? [body.interests] : body.interests;
    if (!Array.isArray(list)) return { error: "Interests must be a list.", field: "interests" };
    const unchanged = JSON.stringify(list) === JSON.stringify(existing?.interests || []);
    if (!unchanged && list.length > MAX_INTERESTS)
      return { error: `You can add up to ${MAX_INTERESTS} interests.`, field: "interests" };
    const interests = [];
    for (const item of list) {
      if (typeof item !== "string" && typeof item !== "number")
        return { error: "Each interest must be text.", field: "interests" };
      const text = String(item).trim();
      if (!unchanged && text.length > MAX_INTEREST_LENGTH)
        return { error: `Each interest must be under ${MAX_INTEREST_LENGTH} characters.`, field: "interests" };
      if (text) interests.push(text);
    }
    update.interests = interests;
  }
  return { update };
};

// ✅ PUT /api/profile
export const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;

    if (name !== undefined && name !== null && typeof name !== "string")
      return res.status(400).json({ field: "name", message: "Name must be text." });

    const [existingProfile, currentUser] = await Promise.all([
      UserProfile.findOne({ userId: req.user.id }).lean(),
      User.findById(req.user.id).select("name").lean(),
    ]);

    // Name is interpolated into emails/notifications; cap new values, but never
    // reject a name that's already saved.
    if (typeof name === "string" && name.trim().length > 200 && name.trim() !== currentUser?.name)
      return res.status(400).json({ field: "name", message: "Name must be under 200 characters." });

    const { update, error, field } = buildProfileUpdate(req.body, existingProfile || {});
    if (error) return res.status(400).json({ field, message: error });

    // Update name on the base User model if provided
    if (name && name.trim()) {
      const trimmedName = name.trim();
      await User.findByIdAndUpdate(req.user.id, { name: trimmedName });
      invalidateAuthCache(req.user.id);

      // Keep Firebase's displayName in sync so the auth token carries the same
      // name and nothing reverts it on the next request. Non-fatal.
      if (req.user.firebaseUid) {
        admin.auth()
          .updateUser(req.user.firebaseUid, { displayName: trimmedName })
          .catch((err) => console.error("Firebase displayName sync failed:", err.message));
      }
    }

    const profile = await UserProfile.findOneAndUpdate(
      { userId: req.user.id },
      { $set: { ...update, userId: req.user.id } },
      { new: true, upsert: true, runValidators: true }
    );

    const baseUser = await User.findById(req.user.id).select("name email");

    // Profile completion is one of the referral milestones - re-check after every save.
    checkAndQualifyMilestones(req.user.id).catch((err) =>
      console.error("checkAndQualifyMilestones error:", err.message)
    );

    res.json({
      ...profile.toObject(),
      name: baseUser?.name,
      email: baseUser?.email,
    });
  } catch (err) {
    console.error("Error saving profile:", err);
    res.status(500).json({ message: "Error saving profile", expose: true });
  }
};

export const uploadProfileImage = async (req, res) => {
  try {
    const { file } = req.body; // base64 string from frontend
    if (!file) {
      return res.status(400).json({ message: "No file received" });
    }
    const rejection = uploadRejectionReason(file, IMAGE_MIME_TYPES);
    if (rejection) return res.status(400).json({ message: rejection });

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
    res.status(500).json({ message: "Upload failed", expose: true });
  }
};

// ✅ POST /api/profile/upi-qr — upload the user's UPI QR scanner image.
// Same base64 flow as the avatar upload; replaces any previous QR.
export const uploadUpiQr = async (req, res) => {
  try {
    const { file } = req.body; // base64 data URI from the client
    if (!file) return res.status(400).json({ message: "No file received" });

    const rejection = uploadRejectionReason(file, IMAGE_MIME_TYPES);
    if (rejection) return res.status(400).json({ message: rejection });

    const existing = await UserProfile.findOne({ userId: req.user.id });

    // Remove the previous QR so we don't accumulate orphaned Cloudinary assets.
    if (existing?.upiQr?.public_id) {
      await cloudinary.uploader.destroy(existing.upiQr.public_id).catch(() => {});
    }

    const result = await cloudinary.uploader.upload(file, {
      folder: "splitwise_upi_qr",
      resource_type: "image",
    });

    const updated = await UserProfile.findOneAndUpdate(
      { userId: req.user.id },
      { userId: req.user.id, upiQr: { url: result.secure_url, public_id: result.public_id } },
      { new: true, upsert: true }
    );

    res.json({ message: "UPI QR updated successfully", upiQr: updated.upiQr });
  } catch (err) {
    console.error("uploadUpiQr error:", err);
    res.status(500).json({ message: "Upload failed", expose: true });
  }
};

// ✅ DELETE /api/profile/upi-qr — remove the stored UPI QR image.
export const removeUpiQr = async (req, res) => {
  try {
    const existing = await UserProfile.findOne({ userId: req.user.id });
    if (existing?.upiQr?.public_id) {
      await cloudinary.uploader.destroy(existing.upiQr.public_id).catch(() => {});
    }
    await UserProfile.findOneAndUpdate(
      { userId: req.user.id },
      { $set: { upiQr: { url: "", public_id: "" } } },
      { upsert: true }
    );
    res.json({ message: "UPI QR removed", upiQr: { url: "", public_id: "" } });
  } catch (err) {
    console.error("removeUpiQr error:", err);
    res.status(500).json({ message: "Failed to remove UPI QR", expose: true });
  }
};

// ✅ DELETE /api/profile/account
export const deleteAccount = async (req, res) => {  try {
    const uid = req.user.id;
    const firebaseUid = req.user.firebaseUid;

    // Cancel any not-yet-qualified referral where this user was the invitee.
    // (If they were the referrer on a pending payout, payoutReferral() already
    // handles a missing referrer gracefully by skipping that side's reward.)
    await cancelPendingReferralFor(uid);

    // Remove user from all groups (as member)
    await Group.updateMany({ members: uid }, { $pull: { members: uid } });

    // Delete groups the user created
    await Group.deleteMany({ createdBy: uid });

    // Delete profile image from Cloudinary if exists
    const profile = await UserProfile.findOne({ userId: uid });
    if (profile?.profileImage?.public_id) {
      await cloudinary.uploader.destroy(profile.profileImage.public_id).catch(() => {});
    }
    if (profile?.upiQr?.public_id) {
      await cloudinary.uploader.destroy(profile.upiQr.public_id).catch(() => {});
    }

    // Delete UserProfile and User records
    await UserProfile.deleteOne({ userId: uid });
    await User.deleteOne({ _id: uid });
    invalidateAuthCache(uid);

    // Delete from Firebase Auth if we have the Firebase UID
    if (firebaseUid) {
      await admin.auth().deleteUser(firebaseUid).catch(() => {});
    }

    res.json({ success: true, message: "Account permanently deleted" });
  } catch (err) {
    console.error("deleteAccount error:", err);
    res.status(500).json({ message: "Failed to delete account", expose: true });
  }
};
