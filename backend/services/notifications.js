const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
const config = require("../config");
const User = require("../models/User");

let firebaseInitialized = false;

function normalizeDataPayload(data = {}) {
  const normalized = {};
  Object.entries(data || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    normalized[String(key)] = String(value);
  });
  return normalized;
}

async function clearStaleTokens(tokens = []) {
  const uniqueTokens = [...new Set((tokens || []).filter(Boolean))];
  if (uniqueTokens.length === 0) return;

  try {
    const result = await User.updateMany(
      { pushToken: { $in: uniqueTokens } },
      { $set: { pushToken: "", pushTokenType: "" } }
    );
    console.log(`[notifications] Cleared stale tokens: ${result.modifiedCount || 0}`);
  } catch (error) {
    console.warn("[notifications] Failed to clear stale tokens:", error.message);
  }
}

function initFirebase() {
  if (firebaseInitialized) return;
  if (!config.fcmServiceAccountPath) {
    console.warn("[notifications] Missing FCM_SERVICE_ACCOUNT_PATH, skipping Firebase init.");
    return;
  }

  const resolvedPath = path.resolve(process.cwd(), config.fcmServiceAccountPath);
  if (!fs.existsSync(resolvedPath)) {
    console.warn(`[notifications] Service account file not found: ${resolvedPath}`);
    return;
  }

  const serviceAccount = require(resolvedPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  firebaseInitialized = true;
  console.log("[notifications] Firebase Admin initialized successfully");
}

// Send via Firebase Cloud Messaging (for FCM device tokens from APK)
async function sendFCM(tokens, title, body, data) {
  initFirebase();
  if (!firebaseInitialized || tokens.length === 0) return;

  const normalizedData = normalizeDataPayload(data);

  const message = {
    tokens,
    notification: { title: title || "", body: body || "" },
    data: normalizedData,
    android: {
      priority: "high",
      notification: {
        sound: "default",
        channelId: "default",
      },
    },
  };

  try {
    const result = await admin.messaging().sendEachForMulticast(message);
    console.log(`[notifications] FCM sent: ${result.successCount} success, ${result.failureCount} failed`);

    const staleTokens = [];
    result.responses.forEach((entry, index) => {
      if (!entry?.success) {
        const code = entry?.error?.code || "";
        if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
          staleTokens.push(tokens[index]);
        }
      }
    });
    await clearStaleTokens(staleTokens);
  } catch (error) {
    console.warn("[notifications] FCM send error:", error.message);
  }
}

// Send via Expo Push API (for Expo Push Tokens from Expo Go)
async function sendExpo(tokens, title, body, data) {
  if (tokens.length === 0) return;

  const normalizedData = normalizeDataPayload(data);

  const messages = tokens.map((token) => ({
    to: token,
    sound: "default",
    priority: "high",
    channelId: "default",
    title: title || "",
    body: body || "",
    data: normalizedData,
  }));

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });
    const result = await response.json();
    console.log(`[notifications] Expo push sent to ${tokens.length} token(s):`, JSON.stringify(result.data?.map(d => d.status) || result));

    const staleTokens = [];
    const receipts = Array.isArray(result?.data) ? result.data : [];
    receipts.forEach((entry, index) => {
      const errorCode = entry?.details?.error || "";
      if (entry?.status === "error" && errorCode === "DeviceNotRegistered") {
        staleTokens.push(tokens[index]);
      }
    });
    await clearStaleTokens(staleTokens);
  } catch (error) {
    console.warn("[notifications] Expo push error:", error.message);
  }
}

// Main function - routes tokens to the correct service
async function sendToTokens(tokens, payload) {
  if (!tokens || tokens.length === 0) return;

  const { title, body, data } = payload || {};

  // Separate tokens by type
  const fcmTokens = [];
  const expoTokens = [];

  for (const token of tokens) {
    if (typeof token === "object" && token.token) {
      // { token: "...", type: "fcm"|"expo" }
      if (token.type === "expo" || token.token.startsWith("ExponentPushToken")) {
        expoTokens.push(token.token);
      } else {
        fcmTokens.push(token.token);
      }
    } else if (typeof token === "string") {
      if (token.startsWith("ExponentPushToken")) {
        expoTokens.push(token);
      } else {
        fcmTokens.push(token);
      }
    }
  }

  console.log(`[notifications] Routing: ${fcmTokens.length} FCM, ${expoTokens.length} Expo`);

  const promises = [];
  if (fcmTokens.length > 0) promises.push(sendFCM(fcmTokens, title, body, data));
  if (expoTokens.length > 0) promises.push(sendExpo(expoTokens, title, body, data));

  await Promise.allSettled(promises);
}

module.exports = { sendToTokens };
