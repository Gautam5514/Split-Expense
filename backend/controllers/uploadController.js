import cloudinary from "../config/cloudinary.js";

export const uploadMedia = async (req, res) => {
  try {
    const { file, folder = "splitwise_uploads", resourceType = "auto" } = req.body;

    if (!file) {
      return res.status(400).json({ message: "No file provided" });
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(file, {
      folder,
      resource_type: resourceType, // auto-detect image/video
    });

    res.json({
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
    });
  } catch (err) {
    console.error("Cloudinary Upload Error:", err);
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
};
