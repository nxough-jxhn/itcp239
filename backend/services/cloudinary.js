const fs = require("fs");
const { v2: cloudinary } = require("cloudinary");
const config = require("../config");

let cloudinaryConfigured = false;
let configAttempted = false;

function ensureCloudinaryConfigured() {
  if (cloudinaryConfigured) return true;
  if (configAttempted) return false;

  configAttempted = true;

  if (config.cloudinaryUrl) {
    cloudinary.config(config.cloudinaryUrl);
    cloudinaryConfigured = true;
    return true;
  }

  if (config.cloudinaryCloudName && config.cloudinaryApiKey && config.cloudinaryApiSecret) {
    cloudinary.config({
      cloud_name: config.cloudinaryCloudName,
      api_key: config.cloudinaryApiKey,
      api_secret: config.cloudinaryApiSecret,
      secure: true,
    });
    cloudinaryConfigured = true;
    return true;
  }

  return false;
}

async function removeLocalFile(filePath) {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (_error) {
    // Best effort cleanup only.
  }
}

async function uploadLocalImage(filePath, { folder = "peakplay" } = {}) {
  if (!filePath) return "";
  if (!ensureCloudinaryConfigured()) return "";

  try {
    const uploaded = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: "image",
    });

    await removeLocalFile(filePath);
    return String(uploaded?.secure_url || uploaded?.url || "");
  } catch (error) {
    console.warn("[cloudinary] Upload failed:", error.message);
    return "";
  }
}

function isCloudinaryConfigured() {
  return ensureCloudinaryConfigured();
}

module.exports = {
  uploadLocalImage,
  isCloudinaryConfigured,
};
