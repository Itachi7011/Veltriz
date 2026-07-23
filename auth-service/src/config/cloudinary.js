const cloudinary = require('cloudinary').v2;
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// We upload to Cloudinary manually (see auth.controller.js uploadAvatarHandler)
// instead of using `multer-storage-cloudinary`, which as of writing only
// supports Cloudinary SDK v1.x (a version line with a known high-severity
// arbitrary argument injection vulnerability, GHSA-g4mf-96x5-5m2c, fixed
// only in v2.7.0+). Using memoryStorage + cloudinary.uploader.upload_stream
// directly lets us run the patched v2 SDK without that vulnerable
// dependency at all.
const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, and WEBP images are allowed'));
    }
    cb(null, true);
  },
});

/**
 * Uploads an in-memory file buffer to Cloudinary via a stream (no temp
 * file on disk). Returns the Cloudinary upload result, whose `secure_url`
 * is what gets stored as the user's avatarUrl.
 */
const uploadBufferToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'veltriz/avatars',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 512, height: 512, crop: 'fill', gravity: 'face' }],
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });

module.exports = { cloudinary, uploadAvatar, uploadBufferToCloudinary };
