const express = require("express");
const mongoose = require("mongoose");
const authJwt = require("../middleware/authJwt");
const Product = require("../models/Product");
const Promo = require("../models/Promo");
const User = require("../models/User");
const VoucherRedemption = require("../models/VoucherRedemption");
const { sendToTokens } = require("../services/notifications");
const {
  derivePromoStatus,
  findActiveVoucherByCode,
  getEligibleItemsForCampaign,
  computeVoucherDiscount,
  toMoney,
} = require("../services/promoPricing");

const router = express.Router();

function requireAdmin(req, res) {
  if (!req.user?.isAdmin) {
    res.status(403).json({ message: "Admin access required" });
    return false;
  }
  return true;
}

function parseDateInput(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function applyDurationPreset(startAt, durationPreset) {
  const endAt = new Date(startAt);
  if (durationPreset === "3d") {
    endAt.setDate(endAt.getDate() + 3);
    return endAt;
  }
  if (durationPreset === "7d") {
    endAt.setDate(endAt.getDate() + 7);
    return endAt;
  }
  if (durationPreset === "1m") {
    endAt.setMonth(endAt.getMonth() + 1);
    return endAt;
  }
  return null;
}

function ensureValidDiscount(discountType, discountValue) {
  if (!["percent", "fixed"].includes(discountType)) {
    return "discountType must be 'percent' or 'fixed'";
  }

  const value = Number(discountValue);
  if (!Number.isFinite(value) || value <= 0) {
    return "discountValue must be a number greater than zero";
  }

  if (discountType === "percent" && value > 100) {
    return "discountValue cannot exceed 100 for percent discounts";
  }

  return "";
}

function ensureValidCampaignType(type) {
  if (!["promo", "voucher"].includes(type)) {
    return "type must be 'promo' or 'voucher'";
  }
  return "";
}

function ensureNumericField(value, fieldName, { allowNull = true, min = 0 } = {}) {
  if (value === undefined || value === null || value === "") {
    return allowNull ? "" : `${fieldName} is required`;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return `${fieldName} must be numeric`;
  if (parsed < min) return `${fieldName} must be >= ${min}`;
  return "";
}

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}

function ensureValidVoucherConfig(payload) {
  const code = normalizeCode(payload?.code);
  if (!code) return "Voucher code is required";

  const usagePolicy = String(payload?.usagePolicy || "none").trim().toLowerCase();
  if (!["one_time_total", "global_limit", "per_user_limit"].includes(usagePolicy)) {
    return "usagePolicy must be one of: one_time_total, global_limit, per_user_limit";
  }

  if (usagePolicy === "global_limit") {
    const err = ensureNumericField(payload?.globalLimit, "globalLimit", { allowNull: false, min: 1 });
    if (err) return err;
  }

  if (usagePolicy === "per_user_limit") {
    const err = ensureNumericField(payload?.perUserLimit, "perUserLimit", { allowNull: false, min: 1 });
    if (err) return err;
  }

  const minErr = ensureNumericField(payload?.minOrderAmount, "minOrderAmount", { allowNull: true, min: 0 });
  if (minErr) return minErr;

  const maxErr = ensureNumericField(payload?.maxDiscountAmount, "maxDiscountAmount", { allowNull: true, min: 0 });
  if (maxErr) return maxErr;

  return "";
}

function normalizeObjectIds(values = []) {
  const unique = [...new Set((values || []).map((v) => String(v || "").trim()).filter(Boolean))];
  const invalid = unique.filter((id) => !mongoose.Types.ObjectId.isValid(id));
  return {
    invalid,
    ids: unique
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id)),
  };
}

async function resolveTargetProducts(targetMode, targetProductIds, targetCategoryIds) {
  if (targetMode === "all") {
    const all = await Product.find({}, "_id").lean();
    return {
      targetProductIds: [],
      targetCategoryIds: [],
      resolvedProductIds: all.map((p) => p._id),
    };
  }

  if (targetMode === "products") {
    const parsed = normalizeObjectIds(targetProductIds);
    if (parsed.invalid.length > 0) {
      throw new Error(`Invalid product id(s): ${parsed.invalid.join(", ")}`);
    }
    if (parsed.ids.length === 0) {
      throw new Error("At least one product is required when targetMode is 'products'");
    }

    const existing = await Product.find({ _id: { $in: parsed.ids } }, "_id").lean();
    if (existing.length !== parsed.ids.length) {
      throw new Error("One or more selected products do not exist");
    }

    return {
      targetProductIds: parsed.ids,
      targetCategoryIds: [],
      resolvedProductIds: existing.map((p) => p._id),
    };
  }

  if (targetMode === "categories") {
    const parsedCategories = normalizeObjectIds(targetCategoryIds);
    if (parsedCategories.invalid.length > 0) {
      throw new Error(`Invalid category id(s): ${parsedCategories.invalid.join(", ")}`);
    }
    if (parsedCategories.ids.length === 0) {
      throw new Error("At least one category is required when targetMode is 'categories'");
    }

    const products = await Product.find({ category: { $in: parsedCategories.ids } }, "_id").lean();
    if (products.length === 0) {
      throw new Error("No products found for the selected categories");
    }

    return {
      targetProductIds: [],
      targetCategoryIds: parsedCategories.ids,
      resolvedProductIds: products.map((p) => p._id),
    };
  }

  throw new Error("targetMode must be one of: products, categories, all");
}

function intersects(a, b) {
  const bSet = new Set((b || []).map((id) => id.toString()));
  return (a || []).filter((id) => bSet.has(id.toString()));
}

async function findConflicts(resolvedProductIds, startAt, endAt, excludePromoId = null) {
  if (!resolvedProductIds || resolvedProductIds.length === 0) return [];

  const query = {
    type: "promo",
    isEnabled: true,
    startAt: { $lt: endAt },
    endAt: { $gt: startAt },
    resolvedProductIds: { $in: resolvedProductIds },
  };

  if (excludePromoId && mongoose.Types.ObjectId.isValid(excludePromoId)) {
    query._id = { $ne: new mongoose.Types.ObjectId(excludePromoId) };
  }

  const existing = await Promo.find(query)
    .select("name startAt endAt resolvedProductIds isEnabled")
    .lean();

  return existing
    .map((promo) => ({
      ...promo,
      overlappingProductIds: intersects(promo.resolvedProductIds, resolvedProductIds),
    }))
    .filter((promo) => promo.overlappingProductIds.length > 0);
}

async function applyConflictStrategy(conflictStrategy, resolvedProductIds, conflicts) {
  const overlapIds = [...new Set(conflicts.flatMap((c) => c.overlappingProductIds.map((id) => id.toString())))];

  if (conflicts.length === 0) {
    return { finalResolvedIds: resolvedProductIds, conflictsResolved: false };
  }

  if (!conflictStrategy || conflictStrategy === "none") {
    return {
      blocked: true,
      message: "Promo conflict detected. Choose exclude_conflicts or override_conflicts.",
      conflicts,
      allowedStrategies: ["exclude_conflicts", "override_conflicts"],
    };
  }

  if (conflictStrategy === "exclude_conflicts") {
    const overlapSet = new Set(overlapIds);
    const remaining = resolvedProductIds.filter((id) => !overlapSet.has(id.toString()));
    if (remaining.length === 0) {
      return {
        blocked: true,
        message: "All selected products conflict with active promos. No products left after exclusion.",
        conflicts,
      };
    }
    return { finalResolvedIds: remaining, conflictsResolved: true };
  }

  if (conflictStrategy === "override_conflicts") {
    const overlapSet = new Set(overlapIds);
    for (const conflict of conflicts) {
      const updatedIds = (conflict.resolvedProductIds || []).filter(
        (id) => !overlapSet.has(id.toString())
      );

      await Promo.findByIdAndUpdate(conflict._id, {
        $set: {
          resolvedProductIds: updatedIds,
          isEnabled: updatedIds.length > 0,
        },
      });
    }
    return { finalResolvedIds: resolvedProductIds, conflictsResolved: true };
  }

  return {
    blocked: true,
    message: "Invalid conflictStrategy. Use none, exclude_conflicts, or override_conflicts.",
  };
}

function formatDuration(startAt, endAt) {
  const ms = new Date(endAt).getTime() - new Date(startAt).getTime();
  const days = Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  if (days === 30 || days === 31) return "about 1 month";
  if (days === 1) return "1 day";
  return `${days} days`;
}

function promoToResponse(promo) {
  const plain = typeof promo.toJSON === "function" ? promo.toJSON() : promo;
  return {
    ...plain,
    status: derivePromoStatus(plain),
  };
}

async function sendPromoNotification(promo) {
  const recipients = await User.find(
    { isAdmin: false, pushToken: { $ne: "" } },
    "pushToken pushTokenType"
  ).lean();

  const tokens = recipients
    .filter((user) => user.pushToken)
    .map((user) => ({ token: user.pushToken, type: user.pushTokenType || "fcm" }));

  const expoCount = tokens.filter((token) => String(token.type).toLowerCase() === "expo" || String(token.token || "").startsWith("ExponentPushToken")).length;
  const fcmCount = tokens.length - expoCount;
  console.log(`[promos] Notification recipients: ${tokens.length} total (${fcmCount} FCM, ${expoCount} Expo)`);

  if (tokens.length === 0) {
    return { sent: 0 };
  }

  const durationLabel = formatDuration(promo.startAt, promo.endAt);
  const campaignType = String(promo.type || "promo").toLowerCase();
  const notificationType = campaignType === "voucher" ? "voucher" : "promo";
  const voucherSuffix = campaignType === "voucher" && promo.code ? ` Use code: ${promo.code}.` : "";

  await sendToTokens(tokens, {
    title: String(promo.name || "Promo"),
    body: `${promo.description} (Valid for ${durationLabel})${voucherSuffix}`,
    data: {
      route: "notifications",
      type: notificationType,
      promoId: promo.id || promo._id?.toString(),
      campaignType: notificationType,
      code: promo.code || "",
      startAt: new Date(promo.startAt).toISOString(),
      endAt: new Date(promo.endAt).toISOString(),
    },
  });

  return { sent: tokens.length };
}

function parseCartItemsForValidation(orderItems = []) {
  return (orderItems || []).map((item) => {
    const productId =
      item.product ||
      item.id ||
      (typeof item._id === "string" ? item._id : item._id?.toString());
    const quantity = Math.max(1, Number(item.quantity) || 1);

    return {
      product: String(productId || "").trim(),
      quantity,
    };
  }).filter((item) => mongoose.Types.ObjectId.isValid(item.product));
}

async function computeVoucherPreview({ code, orderItems, userId }) {
  const voucher = await findActiveVoucherByCode(code);
  if (!voucher) {
    return { valid: false, message: "Voucher not found or not active" };
  }

  const usagePolicy = String(voucher.usagePolicy || "none");
  if (usagePolicy === "one_time_total" && Number(voucher.usedCount || 0) >= 1) {
    return { valid: false, message: "Voucher already used" };
  }
  if (usagePolicy === "global_limit" && Number(voucher.usedCount || 0) >= Number(voucher.globalLimit || 0)) {
    return { valid: false, message: "Voucher reached global usage limit" };
  }
  if (usagePolicy === "per_user_limit") {
    const usedByUser = await VoucherRedemption.countDocuments({ campaign: voucher._id, user: userId });
    if (usedByUser >= Number(voucher.perUserLimit || 0)) {
      return { valid: false, message: "Voucher usage limit reached for this user" };
    }
  }

  const parsedItems = parseCartItemsForValidation(orderItems);
  if (parsedItems.length === 0) {
    return { valid: false, message: "No valid cart items provided for voucher validation" };
  }

  const uniqueIds = [...new Set(parsedItems.map((item) => item.product))];
  const products = await Product.find({ _id: { $in: uniqueIds } }, "price").lean();
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const pricedItems = parsedItems.map((item) => {
    const product = productMap.get(item.product);
    return {
      ...item,
      unitPrice: Number(product?.price || 0),
      lineTotal: toMoney((Number(product?.price || 0)) * item.quantity),
    };
  });

  const subtotal = toMoney(pricedItems.reduce((sum, item) => sum + item.lineTotal, 0));
  if (subtotal <= 0) {
    return { valid: false, message: "Cart subtotal is invalid" };
  }

  if (subtotal < Number(voucher.minOrderAmount || 0)) {
    return { valid: false, message: `Minimum order amount is ${voucher.minOrderAmount}` };
  }

  const eligibleItems = getEligibleItemsForCampaign(pricedItems, voucher);
  const eligibleSubtotal = toMoney(eligibleItems.reduce((sum, item) => sum + item.lineTotal, 0));
  if (eligibleSubtotal <= 0) {
    return { valid: false, message: "Voucher does not apply to any items in this cart" };
  }

  const voucherDiscount = computeVoucherDiscount(voucher, eligibleSubtotal);
  if (voucherDiscount <= 0) {
    return { valid: false, message: "Voucher discount resolves to zero" };
  }

  return {
    valid: true,
    campaign: voucher,
    subtotal,
    eligibleSubtotal,
    voucherDiscount,
  };
}

// POST /promos/validate-voucher — customer validates voucher code against current cart
router.post("/validate-voucher", authJwt, async (req, res) => {
  try {
    const code = normalizeCode(req.body?.code);
    const orderItems = req.body?.orderItems || [];

    if (!code) {
      return res.status(400).json({ valid: false, message: "Voucher code is required" });
    }

    const result = await computeVoucherPreview({ code, orderItems, userId: req.user.userId });
    if (!result.valid) {
      return res.status(400).json(result);
    }

    return res.status(200).json({
      valid: true,
      code,
      campaignId: result.campaign._id,
      campaignType: result.campaign.type,
      voucherDiscount: result.voucherDiscount,
      subtotal: result.subtotal,
      eligibleSubtotal: result.eligibleSubtotal,
      finalTotalAfterVoucher: toMoney(result.subtotal - result.voucherDiscount),
    });
  } catch (_error) {
    return res.status(500).json({ valid: false, message: "Failed to validate voucher" });
  }
});

// GET /promos/active-vouchers — customer list active vouchers for selection UI
router.get("/active-vouchers", authJwt, async (_req, res) => {
  try {
    const now = new Date();

    const vouchers = await Promo.find({
      type: "voucher",
      isEnabled: true,
      startAt: { $lte: now },
      endAt: { $gte: now },
    })
      .sort({ endAt: 1, createdAt: -1 })
      .lean();

    const shaped = vouchers.map((promo) => {
      const plain = promoToResponse(promo);
      return {
        _id: plain._id,
        code: plain.code,
        name: plain.name,
        description: plain.description,
        discountType: plain.discountType,
        discountValue: plain.discountValue,
        minOrderAmount: plain.minOrderAmount,
        maxDiscountAmount: plain.maxDiscountAmount,
        targetMode: plain.targetMode,
        startAt: plain.startAt,
        endAt: plain.endAt,
        status: plain.status,
      };
    });

    return res.status(200).json(shaped);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load active vouchers" });
  }
});

// GET /promos — admin-only list all promos
router.get("/", authJwt, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const promos = await Promo.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(promos.map((promo) => promoToResponse(promo)));
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load promos" });
  }
});

// GET /promos/:id — admin-only promo details
router.get("/:id", authJwt, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const promo = await Promo.findById(req.params.id).lean();
    if (!promo) {
      return res.status(404).json({ message: "Promo not found" });
    }

    return res.status(200).json(promoToResponse(promo));
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load promo" });
  }
});

// POST /promos — admin-only create promo
router.post("/", authJwt, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const name = String(req.body?.name || "").trim();
    const description = String(req.body?.description || "").trim();
    const type = String(req.body?.type || "promo").trim().toLowerCase();
    const discountType = String(req.body?.discountType || "").trim().toLowerCase();
    const discountValue = Number(req.body?.discountValue);
    const targetMode = String(req.body?.targetMode || "").trim().toLowerCase();
    const durationPreset = String(req.body?.durationPreset || "manual").trim().toLowerCase();
    const conflictStrategy = String(req.body?.conflictStrategy || "none").trim().toLowerCase();

    if (!name || !description) {
      return res.status(400).json({ message: "name and description are required" });
    }

    const typeError = ensureValidCampaignType(type);
    if (typeError) {
      return res.status(400).json({ message: typeError });
    }

    const discountError = ensureValidDiscount(discountType, discountValue);
    if (discountError) {
      return res.status(400).json({ message: discountError });
    }

    const today = startOfToday();
    const startAt = parseDateInput(req.body?.startAt);
    if (!startAt) {
      return res.status(400).json({ message: "startAt is required and must be a valid date" });
    }
    if (startAt < today) {
      return res.status(400).json({ message: "startAt cannot be in the past" });
    }

    let endAt = null;
    if (["3d", "7d", "1m"].includes(durationPreset)) {
      endAt = applyDurationPreset(startAt, durationPreset);
    } else {
      endAt = parseDateInput(req.body?.endAt);
    }

    if (!endAt || endAt <= startAt) {
      return res.status(400).json({ message: "endAt must be later than startAt" });
    }

    const target = await resolveTargetProducts(
      targetMode,
      req.body?.targetProductIds || [],
      req.body?.targetCategoryIds || []
    );

    let strategyResult = { finalResolvedIds: target.resolvedProductIds, conflictsResolved: false };
    if (type === "promo") {
      const conflicts = await findConflicts(target.resolvedProductIds, startAt, endAt);
      strategyResult = await applyConflictStrategy(
        conflictStrategy,
        target.resolvedProductIds,
        conflicts
      );

      if (strategyResult.blocked) {
        return res.status(409).json(strategyResult);
      }
    }

    const voucherConfigError = type === "voucher" ? ensureValidVoucherConfig(req.body) : "";
    if (voucherConfigError) {
      return res.status(400).json({ message: voucherConfigError });
    }

    const code = type === "voucher" ? normalizeCode(req.body?.code) : undefined;
    if (type === "voucher") {
      const existingCode = await Promo.findOne({ code, _id: { $ne: null } }).lean();
      if (existingCode) {
        return res.status(409).json({ message: "Voucher code already exists" });
      }
    }

    const usagePolicy = type === "voucher"
      ? String(req.body?.usagePolicy || "").trim().toLowerCase()
      : "none";

    const promo = await Promo.create({
      type,
      name,
      description,
      discountType,
      discountValue,
      durationPreset,
      code,
      usagePolicy,
      globalLimit: type === "voucher" && usagePolicy === "global_limit" ? Number(req.body?.globalLimit) : null,
      perUserLimit: type === "voucher" && usagePolicy === "per_user_limit" ? Number(req.body?.perUserLimit) : null,
      maxDiscountAmount: type === "voucher" && req.body?.maxDiscountAmount !== undefined && req.body?.maxDiscountAmount !== ""
        ? Number(req.body?.maxDiscountAmount)
        : null,
      minOrderAmount: type === "voucher" && req.body?.minOrderAmount !== undefined && req.body?.minOrderAmount !== ""
        ? Number(req.body?.minOrderAmount)
        : 0,
      startAt,
      endAt,
      targetMode,
      targetProductIds: target.targetProductIds,
      targetCategoryIds: target.targetCategoryIds,
      resolvedProductIds: strategyResult.finalResolvedIds,
      conflictStrategy,
      isEnabled: true,
    });

    const notifyResult = await sendPromoNotification(promo);
    promo.lastNotifiedAt = new Date();
    await promo.save();

    return res.status(201).json({
      success: true,
      promo: promoToResponse(promo),
      sent: notifyResult.sent,
      conflictsResolved: strategyResult.conflictsResolved,
    });
  } catch (error) {
    if (Number(error?.code) === 11000) {
      if (error?.keyPattern?.code) {
        return res.status(409).json({ message: "Voucher code already exists" });
      }
      return res.status(409).json({ message: "Duplicate campaign value detected" });
    }
    return res.status(500).json({ message: error.message || "Failed to create promo" });
  }
});

// PUT /promos/:id — admin-only edit promo
router.put("/:id", authJwt, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const promo = await Promo.findById(req.params.id);
    if (!promo) {
      return res.status(404).json({ message: "Promo not found" });
    }

    const name = req.body?.name !== undefined ? String(req.body.name || "").trim() : promo.name;
    const description = req.body?.description !== undefined
      ? String(req.body.description || "").trim()
      : promo.description;
    const type = req.body?.type !== undefined
      ? String(req.body.type || "").trim().toLowerCase()
      : String(promo.type || "promo");
    const discountType = req.body?.discountType !== undefined
      ? String(req.body.discountType || "").trim().toLowerCase()
      : promo.discountType;
    const discountValue = req.body?.discountValue !== undefined
      ? Number(req.body.discountValue)
      : Number(promo.discountValue);
    const targetMode = req.body?.targetMode !== undefined
      ? String(req.body.targetMode || "").trim().toLowerCase()
      : promo.targetMode;
    const durationPreset = req.body?.durationPreset !== undefined
      ? String(req.body.durationPreset || "manual").trim().toLowerCase()
      : promo.durationPreset;
    const conflictStrategy = String(req.body?.conflictStrategy || "none").trim().toLowerCase();

    if (!name || !description) {
      return res.status(400).json({ message: "name and description are required" });
    }

    const typeError = ensureValidCampaignType(type);
    if (typeError) {
      return res.status(400).json({ message: typeError });
    }

    const discountError = ensureValidDiscount(discountType, discountValue);
    if (discountError) {
      return res.status(400).json({ message: discountError });
    }

    const today = startOfToday();
    const startAt = req.body?.startAt !== undefined
      ? parseDateInput(req.body.startAt)
      : new Date(promo.startAt);
    if (!startAt) {
      return res.status(400).json({ message: "startAt must be a valid date" });
    }
    if (startAt < today) {
      return res.status(400).json({ message: "startAt cannot be in the past" });
    }

    let endAt = null;
    if (["3d", "7d", "1m"].includes(durationPreset)) {
      endAt = applyDurationPreset(startAt, durationPreset);
    } else if (req.body?.endAt !== undefined) {
      endAt = parseDateInput(req.body.endAt);
    } else {
      endAt = new Date(promo.endAt);
    }

    if (!endAt || endAt <= startAt) {
      return res.status(400).json({ message: "endAt must be later than startAt" });
    }

    const target = await resolveTargetProducts(
      targetMode,
      req.body?.targetProductIds !== undefined ? req.body.targetProductIds : promo.targetProductIds,
      req.body?.targetCategoryIds !== undefined ? req.body.targetCategoryIds : promo.targetCategoryIds
    );

    let strategyResult = { finalResolvedIds: target.resolvedProductIds, conflictsResolved: false };
    if (type === "promo") {
      const conflicts = await findConflicts(target.resolvedProductIds, startAt, endAt, promo._id);
      strategyResult = await applyConflictStrategy(
        conflictStrategy,
        target.resolvedProductIds,
        conflicts
      );

      if (strategyResult.blocked) {
        return res.status(409).json(strategyResult);
      }
    }

    const voucherConfigError = type === "voucher" ? ensureValidVoucherConfig(req.body?.code !== undefined ? req.body : { ...promo.toObject(), ...req.body }) : "";
    if (voucherConfigError) {
      return res.status(400).json({ message: voucherConfigError });
    }

    const code = type === "voucher"
      ? normalizeCode(req.body?.code !== undefined ? req.body?.code : promo.code)
      : undefined;

    if (type === "voucher") {
      const existingCode = await Promo.findOne({ code, _id: { $ne: promo._id } }).lean();
      if (existingCode) {
        return res.status(409).json({ message: "Voucher code already exists" });
      }
    }

    const usagePolicy = type === "voucher"
      ? String(req.body?.usagePolicy !== undefined ? req.body.usagePolicy : promo.usagePolicy || "").trim().toLowerCase()
      : "none";

    promo.type = type;
    promo.name = name;
    promo.description = description;
    promo.discountType = discountType;
    promo.discountValue = discountValue;
    promo.durationPreset = durationPreset;
    promo.code = code;
    promo.usagePolicy = usagePolicy;
    promo.globalLimit = type === "voucher" && usagePolicy === "global_limit"
      ? Number(req.body?.globalLimit !== undefined ? req.body.globalLimit : promo.globalLimit)
      : null;
    promo.perUserLimit = type === "voucher" && usagePolicy === "per_user_limit"
      ? Number(req.body?.perUserLimit !== undefined ? req.body.perUserLimit : promo.perUserLimit)
      : null;
    promo.maxDiscountAmount = type === "voucher"
      ? (req.body?.maxDiscountAmount !== undefined && req.body?.maxDiscountAmount !== ""
        ? Number(req.body.maxDiscountAmount)
        : (promo.maxDiscountAmount || null))
      : null;
    promo.minOrderAmount = type === "voucher"
      ? (req.body?.minOrderAmount !== undefined && req.body?.minOrderAmount !== ""
        ? Number(req.body.minOrderAmount)
        : Number(promo.minOrderAmount || 0))
      : 0;
    promo.startAt = startAt;
    promo.endAt = endAt;
    promo.targetMode = targetMode;
    promo.targetProductIds = target.targetProductIds;
    promo.targetCategoryIds = target.targetCategoryIds;
    promo.resolvedProductIds = strategyResult.finalResolvedIds;
    promo.conflictStrategy = conflictStrategy;

    await promo.save();

    return res.status(200).json({
      success: true,
      promo: promoToResponse(promo),
      conflictsResolved: strategyResult.conflictsResolved,
    });
  } catch (error) {
    if (Number(error?.code) === 11000) {
      if (error?.keyPattern?.code) {
        return res.status(409).json({ message: "Voucher code already exists" });
      }
      return res.status(409).json({ message: "Duplicate campaign value detected" });
    }
    return res.status(500).json({ message: error.message || "Failed to update promo" });
  }
});

// POST /promos/:id/notify — admin-only re-notify users for a promo
router.post("/:id/notify", authJwt, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const promo = await Promo.findById(req.params.id);
    if (!promo) {
      return res.status(404).json({ message: "Promo not found" });
    }

    const notifyResult = await sendPromoNotification(promo);
    promo.lastNotifiedAt = new Date();
    await promo.save();

    return res.status(200).json({ success: true, sent: notifyResult.sent, promo: promoToResponse(promo) });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to notify users for this promo" });
  }
});

// POST /promos/:id/deactivate — admin-only
router.post("/:id/deactivate", authJwt, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const promo = await Promo.findById(req.params.id);
    if (!promo) {
      return res.status(404).json({ message: "Promo not found" });
    }

    promo.isEnabled = false;
    await promo.save();

    return res.status(200).json({ success: true, promo: promoToResponse(promo) });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to deactivate promo" });
  }
});

// POST /promos/:id/reactivate — admin-only, requires a fresh date window
router.post("/:id/reactivate", authJwt, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const promo = await Promo.findById(req.params.id);
    if (!promo) {
      return res.status(404).json({ message: "Promo not found" });
    }

    const startAt = parseDateInput(req.body?.startAt);
    const durationPreset = String(req.body?.durationPreset || "manual").trim().toLowerCase();
    const conflictStrategy = String(req.body?.conflictStrategy || "none").trim().toLowerCase();
    if (!startAt) {
      return res.status(400).json({ message: "startAt is required when reactivating a promo" });
    }

    const today = startOfToday();
    if (startAt < today) {
      return res.status(400).json({ message: "startAt cannot be in the past" });
    }

    let endAt = null;
    if (["3d", "7d", "1m"].includes(durationPreset)) {
      endAt = applyDurationPreset(startAt, durationPreset);
    } else {
      endAt = parseDateInput(req.body?.endAt);
    }

    if (!endAt || endAt <= startAt) {
      return res.status(400).json({ message: "endAt must be later than startAt" });
    }

    const conflicts = await findConflicts(promo.resolvedProductIds || [], startAt, endAt, promo._id);
    const strategyResult = await applyConflictStrategy(
      conflictStrategy,
      promo.resolvedProductIds || [],
      conflicts
    );

    if (strategyResult.blocked) {
      return res.status(409).json(strategyResult);
    }

    promo.startAt = startAt;
    promo.endAt = endAt;
    promo.durationPreset = durationPreset;
    promo.resolvedProductIds = strategyResult.finalResolvedIds;
    promo.conflictStrategy = conflictStrategy;
    promo.isEnabled = true;
    await promo.save();

    return res.status(200).json({
      success: true,
      promo: promoToResponse(promo),
      conflictsResolved: strategyResult.conflictsResolved,
    });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to reactivate promo" });
  }
});

// POST /promos/broadcast — backward compatible simple broadcast
router.post("/broadcast", authJwt, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const title = String(req.body?.title || "").trim();
    const message = String(req.body?.message || "").trim();

    if (!title || !message) {
      return res.status(400).json({ message: "title and message are required" });
    }

    const recipients = await User.find(
      { isAdmin: false, pushToken: { $ne: "" } },
      "pushToken pushTokenType"
    ).lean();

    const tokens = recipients
      .filter((user) => user.pushToken)
      .map((user) => ({ token: user.pushToken, type: user.pushTokenType || "fcm" }));

    if (tokens.length === 0) {
      return res.status(200).json({ success: true, sent: 0, message: "No customer push tokens found" });
    }

    await sendToTokens(tokens, {
      title,
      body: message,
      data: {
        route: "notifications",
        type: "promo",
      },
    });

    return res.status(200).json({ success: true, sent: tokens.length });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to broadcast promo notification" });
  }
});

module.exports = router;
