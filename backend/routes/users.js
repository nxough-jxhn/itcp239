const express = require("express");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { OAuth2Client } = require("google-auth-library");
const { uploadLocalImage } = require("../services/cloudinary");

const config = require("../config");
const authJwt = require("../middleware/authJwt");
const User = require("../models/User");

const router = express.Router();
const googleAuthClient = new OAuth2Client();

const uploadPath = path.resolve(process.cwd(), config.uploadDir);
fs.mkdirSync(uploadPath, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadPath),
  filename: (_req, file, cb) => {
    const safeBase = path
      .parse(file.originalname)
      .name.replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 50);
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${Date.now()}-${safeBase}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxFileSizeMb * 1024 * 1024 },
});

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return false;
}

function buildImageUrl(req, filename) {
  if (!filename) return "";
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const forwardedHost = String(req.headers["x-forwarded-host"] || "").split(",")[0].trim();
  const protocol = forwardedProto || req.protocol;
  const host = forwardedHost || req.get("host");
  return `${protocol}://${host}/${config.uploadDir}/${filename}`;
}

async function resolveUploadedImageUrl(req, file, folder) {
  if (!file) return "";

  const cloudinaryUrl = await uploadLocalImage(file.path, { folder });
  if (cloudinaryUrl) return cloudinaryUrl;

  return buildImageUrl(req, file.filename);
}

router.post("/register", upload.single("image"), async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    const isAdmin = toBoolean(req.body.isAdmin);

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: "name, email, password, and phone are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail }).lean();
    if (existing) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const image = await resolveUploadedImageUrl(req, req.file, "peakplay/users");

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
      phone: String(phone).trim(),
      image,
      isAdmin,
      isVerified: true,
    });

    return res.status(201).json({
      success: true,
      user: user.toJSON(),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to register user" });
  }
});

// [MP2] Google sign-in - verifies id_token, finds or creates user, returns JWT
router.post("/auth/google", async (req, res) => {
  try {
    const { idToken } = req.body;
    console.log("[auth/google] Request received. idToken present:", Boolean(idToken));
    if (!idToken) {
      return res.status(400).json({ message: "idToken is required" });
    }
    if (!config.googleClientIds || config.googleClientIds.length === 0) {
      return res
        .status(503)
        .json({ message: "Google sign-in is not configured. Set GOOGLE_CLIENT_ID or GOOGLE_CLIENT_IDS in .env" });
    }

    const allowedAudiences = config.googleClientIds;
    const ticket = await googleAuthClient.verifyIdToken({
      idToken,
      audience: allowedAudiences,
    });
    const googlePayload = ticket.getPayload() || {};

    console.log("[auth/google] token aud:", googlePayload?.aud);
    if (!googlePayload?.aud || !allowedAudiences.includes(String(googlePayload.aud))) {
      console.log("[auth/google] token rejected. reason: audience mismatch");
      return res.status(401).json({ message: "Invalid Google token" });
    }

    const email = String(googlePayload.email || "").trim().toLowerCase();
    const name = String(googlePayload.name || googlePayload.email || "User").trim();
    const image = String(googlePayload.picture || "");

    if (!email) {
      return res.status(401).json({ message: "Invalid Google token (missing email)" });
    }

    let user = await User.findOne({ email }).lean();
    if (!user) {
      console.log("[auth/google] No existing user. Creating:", email);
      const passwordHash = await bcrypt.hash(
        `social-${Date.now()}-${Math.random().toString(36)}`,
        10
      );
      const newUser = await User.create({
        name,
        email,
        passwordHash,
        phone: "social-signup",
        image,
        isAdmin: false,
        isVerified: true,
      });
      user = newUser.toObject();
    } else {
      console.log("[auth/google] Existing user found:", email);
      if (!user.isVerified) {
        await User.updateOne({ _id: user._id }, { $set: { isVerified: true } });
        user.isVerified = true;
      }
      user.id = user._id.toString();
      delete user._id;
      delete user.passwordHash;
      delete user.pushToken;
      delete user.pushTokenType;
    }

    const payload = {
      userId: user.id || user._id?.toString(),
      email: user.email,
      isAdmin: user.isAdmin || false,
    };
    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });
    console.log("[auth/google] Success. Returning JWT for:", email);
    return res.status(200).json({ token, user: payload });
  } catch (err) {
    console.error("[auth/google] Error:", err.message);
    return res.status(500).json({ message: "Google sign-in failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const passwordMatches = await bcrypt.compare(String(password), user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const payload = {
      userId: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    };

    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

    return res.status(200).json({ token, user: payload });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to login" });
  }
});

// GET /users — admin-only users list for dashboard/admin tools
router.get("/", authJwt, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const users = await User.find({})
      .sort({ createdAt: -1 })
      .select("name email phone image isAdmin isVerified deliveryAddress1 deliveryAddress2 deliveryCity deliveryZip deliveryCountry deliveryLocation createdAt updatedAt");

    return res.status(200).json(users.map((user) => user.toJSON()));
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load users" });
  }
});

router.get("/:id", authJwt, async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.user?.userId;
    const requesterIsAdmin = req.user?.isAdmin === true;

    if (!requesterIsAdmin && requesterId !== id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user.toJSON());
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load user profile" });
  }
});

router.put("/profile", authJwt, async (req, res) => {
  try {
    const allowedFields = [
      "name",
      "phone",
      "deliveryAddress1",
      "deliveryAddress2",
      "deliveryCity",
      "deliveryZip",
      "deliveryCountry",
      "deliveryLocation",
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (typeof updates.name === "string") {
      updates.name = updates.name.trim();
    }
    if (typeof updates.phone === "string") {
      updates.phone = updates.phone.trim();
    }
    if (typeof updates.deliveryAddress1 === "string") {
      updates.deliveryAddress1 = updates.deliveryAddress1.trim();
    }
    if (typeof updates.deliveryAddress2 === "string") {
      updates.deliveryAddress2 = updates.deliveryAddress2.trim();
    }
    if (typeof updates.deliveryCity === "string") {
      updates.deliveryCity = updates.deliveryCity.trim();
    }
    if (typeof updates.deliveryZip === "string") {
      updates.deliveryZip = updates.deliveryZip.trim();
    }
    if (typeof updates.deliveryCountry === "string") {
      updates.deliveryCountry = updates.deliveryCountry.trim();
    }

    if (updates.deliveryLocation) {
      const { latitude, longitude } = updates.deliveryLocation;
      const lat = Number(latitude);
      const lng = Number(longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return res.status(400).json({ message: "deliveryLocation must include numeric latitude and longitude" });
      }

      updates.deliveryLocation = { latitude: lat, longitude: lng };
    }

    const user = await User.findByIdAndUpdate(req.user.userId, updates, { new: true });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user.toJSON());
  } catch (_error) {
    return res.status(500).json({ message: "Failed to update profile" });
  }
});

// PUT /users/profile/image — upload/update profile photo
router.put("/profile/image", authJwt, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Profile image is required" });
    }

    const image = await resolveUploadedImageUrl(req, req.file, "peakplay/users");
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { image },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user.toJSON());
  } catch (_error) {
    return res.status(500).json({ message: "Failed to update profile image" });
  }
});

// POST /users/push-token — save device push token for the current user
router.post("/push-token", authJwt, async (req, res) => {
  try {
    const { token, type } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Push token is required" });
    }

    const normalizedToken = String(token).trim();
    const tokenType = type || (normalizedToken.startsWith("ExponentPushToken") ? "expo" : "fcm");
    const tokenPreview = `${normalizedToken.substring(0, 18)}...`;
    const currentUser = await User.findById(req.user.userId, "email name pushToken").lean();
    const previousOwnerRows = await User.find(
      { _id: { $ne: req.user.userId }, pushToken: normalizedToken },
      "email name"
    ).lean();

    console.log(
      `[POST /push-token] user=${req.user.userId} email=${currentUser?.email || "unknown"} tokenType=${tokenType} token=${tokenPreview}`
    );
    console.log(
      `[POST /push-token] existing token on current user: ${String(currentUser?.pushToken || "").substring(0, 18) || "<none>"}`
    );

    if (previousOwnerRows.length > 0) {
      console.log(
        `[POST /push-token] removing token ownership from ${previousOwnerRows.length} previous account(s): ${previousOwnerRows
          .map((row) => `${row.email || row._id}`)
          .join(", ")}`
      );
    }

    // A device token should be associated with one active account at a time.
    const detachResult = await User.updateMany(
      { _id: { $ne: req.user.userId }, pushToken: normalizedToken },
      { $set: { pushToken: "", pushTokenType: "" } }
    );
    if ((detachResult?.modifiedCount || 0) > 0) {
      console.log(`[POST /push-token] detached token from ${detachResult.modifiedCount} account(s)`);
    }

    await User.findByIdAndUpdate(req.user.userId, {
      pushToken: normalizedToken,
      pushTokenType: tokenType,
    });

    const ownersAfter = await User.countDocuments({ pushToken: normalizedToken });
    if (ownersAfter > 1) {
      console.warn(`[POST /push-token] WARNING token still has ${ownersAfter} owner records`);
    } else {
      console.log(`[POST /push-token] ownership check passed; ownerCount=${ownersAfter}`);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[POST /push-token] Error:', error.message);
    return res.status(500).json({ message: "Failed to save push token" });
  }
});

// DELETE /users/push-token — clear current user's push token (used on logout)
router.delete("/push-token", authJwt, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId, "email name pushToken pushTokenType").lean();
    const oldTokenPreview = String(currentUser?.pushToken || "").substring(0, 18) || "<none>";

    await User.findByIdAndUpdate(req.user.userId, {
      pushToken: "",
      pushTokenType: "",
    });

    console.log(
      `[DELETE /push-token] cleared token for user=${req.user.userId} email=${currentUser?.email || "unknown"} oldToken=${oldTokenPreview} type=${currentUser?.pushTokenType || ""}`
    );
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[DELETE /push-token] Error:', error.message);
    return res.status(500).json({ message: "Failed to clear push token" });
  }
});

module.exports = router;
