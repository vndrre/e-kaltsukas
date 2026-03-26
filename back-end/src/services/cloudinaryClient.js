const { v2: cloudinary } = require("cloudinary");
const { env } = require("../config/env");

if (env.CLOUDINARY_URL) {
  cloudinary.config({
    cloudinary_url: env.CLOUDINARY_URL
  });
}

module.exports = { cloudinary };
