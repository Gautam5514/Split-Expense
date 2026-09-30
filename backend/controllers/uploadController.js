import cloudinary from "../config/cloudinary.js";
import {
  uploadRejectionReason,
  isOctetStream,
  RECEIPT_MIME_TYPES,
  IMAGE_MIME_TYPES,
  USER_UPLOAD_FOLDERS,
  ADMIN_UPLOAD_FOLDERS,
} from "../utils/uploadSecurity.js";

// Only these Cloudinary resource types may be requested. "raw" is excluded:
// it serves arbitrary bytes back verbatim, which is how a mislabeled HTML/JS
// payload would become a hosted file.
const ALLOWED_RESOURCE_TYPES = ["auto", "image"];

/**
 * Build an upload handler bound to a folder + MIME allow-list. The client may
 * still pick a folder/resourceType, but only from the allow-list; anything
 * else falls back to the default rather than letting the client write into
 * arbitrary Cloudinary folders.
 */
const makeUploadHandler = ({ folders, mimeTypes }) => async (req, res) => {
  try {
    const { file, folder, resourceType } = req.body;

    if (!file) {
      return res.status(400).json({ message: "No file provided" });
    }
    const rejection = uploadRejectionReason(file, mimeTypes);
    if (rejection) return res.status(400).json({ message: rejection });

    const safeFolder = folders.includes(folder) ? folder : folders[0];
    // An untyped (octet-stream) payload is only accepted as an image, so it
    // can never end up hosted as a raw file.
    const safeResourceType = isOctetStream(file)
      ? "image"
      : ALLOWED_RESOURCE_TYPES.includes(resourceType) ? resourceType : "auto";

    const result = await cloudinary.uploader.upload(file, {
      folder: safeFolder,
      resource_type: safeResourceType,
    });

    res.json({
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
    });
  } catch (err) {
    console.error("Cloudinary Upload Error:", err);
    res.status(500).json({ message: "Upload failed", expose: true });
  }
};

// Authenticated users: receipts (images + PDF).
export const uploadMedia = makeUploadHandler({
  folders: USER_UPLOAD_FOLDERS,
  mimeTypes: RECEIPT_MIME_TYPES,
});

// Admin panel: blog cover images.
export const uploadAdminMedia = makeUploadHandler({
  folders: ADMIN_UPLOAD_FOLDERS,
  mimeTypes: IMAGE_MIME_TYPES,
});
