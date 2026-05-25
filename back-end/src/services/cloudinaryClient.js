const { v2: cloudinary } = require("cloudinary");
const { env } = require("../config/env");

function parseCloudinaryUrl(rawUrl) {
  const normalizedUrl = (rawUrl || "").trim();
  if (!normalizedUrl.startsWith("cloudinary://")) {
    throw new Error("CLOUDINARY_URL must start with cloudinary://");
  }

  // Parse manually to avoid URL parser edge cases with secret special chars.
  const credentialsAndCloud = normalizedUrl.replace("cloudinary://", "");
  const atIndex = credentialsAndCloud.lastIndexOf("@");
  if (atIndex <= 0 || atIndex >= credentialsAndCloud.length - 1) {
    throw new Error("CLOUDINARY_URL missing credentials or cloud name");
  }

  const credentials = credentialsAndCloud.slice(0, atIndex);
  const cloudName = credentialsAndCloud.slice(atIndex + 1).trim();
  const separatorIndex = credentials.indexOf(":");
  if (separatorIndex <= 0 || separatorIndex >= credentials.length - 1) {
    throw new Error("CLOUDINARY_URL missing api key or api secret");
  }

  const apiKey = credentials.slice(0, separatorIndex).trim();
  const apiSecret = credentials.slice(separatorIndex + 1).trim();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("CLOUDINARY_URL contains empty credentials");
  }

  return { cloudName, apiKey, apiSecret };
}

if (!env.CLOUDINARY_URL) {
  console.warn("CLOUDINARY_URL is not configured");
} else {
  try {
    const { cloudName, apiKey, apiSecret } = parseCloudinaryUrl(env.CLOUDINARY_URL);
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });
  } catch (error) {
    console.error("Failed to parse CLOUDINARY_URL", error);
  }
}

module.exports = { cloudinary };
