const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,  // ✅ Changed from CLOUD_NAME
  api_key: process.env.CLOUDINARY_API_KEY,        // ✅ Changed from CLOUD_API_KEY
  api_secret: process.env.CLOUDINARY_API_SECRET,  // ✅ Changed from CLOUD_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'RentNest',  // ✅ Changed to match your project name
    allowedFormats: ["png", "jpg", "jpeg", "webp", "gif"],
    transformation: [{ 
      width: 800, 
      height: 600, 
      crop: "limit"  // ✅ Changed from "fill" to "limit" to maintain aspect ratio
    }]
  },
});

module.exports = {
  cloudinary,
  storage,
};
