const stream = require("stream");
const { cloudinary } = require("../services/cloudinaryClient");
const { env } = require("../config/env");

function uploadBufferToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    if (!env.CLOUDINARY_URL) {
      return reject(new Error("CLOUDINARY_URL is not configured"));
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "marketplace/items",
        resource_type: "image",
        ...options
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      }
    );

    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    bufferStream.pipe(uploadStream);
  });
}

module.exports = { uploadBufferToCloudinary };
