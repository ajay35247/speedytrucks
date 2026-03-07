/**
 * Cloudinary Service – File upload / delete
 */
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload a file buffer to Cloudinary
 */
const uploadFile = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
    stream.end(buffer);
  });
};

/**
 * Delete a file from Cloudinary by public_id
 */
const deleteFile = (publicId) => cloudinary.uploader.destroy(publicId);

module.exports = { uploadFile, deleteFile };
