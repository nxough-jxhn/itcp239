const mongoose = require("mongoose");
const Promo = require("../models/Promo");

function toObjectIdString(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value.toString === "function") return value.toString();
  return "";
}

function toMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function calculateDiscountedPrice(basePrice, discountType, discountValue) {
  const price = Number(basePrice) || 0;
  const value = Number(discountValue) || 0;

  if (value <= 0 || price <= 0) {
    return {
      originalPrice: toMoney(price),
      discountedPrice: toMoney(price),
      discountAmount: 0,
    };
  }

  let discounted = price;
  if (discountType === "percent") {
    discounted = price * (1 - value / 100);
  } else if (discountType === "fixed") {
    discounted = price - value;
  }

  if (discounted < 0) discounted = 0;

  const roundedOriginal = toMoney(price);
  const roundedDiscounted = toMoney(discounted);

  return {
    originalPrice: roundedOriginal,
    discountedPrice: roundedDiscounted,
    discountAmount: toMoney(roundedOriginal - roundedDiscounted),
  };
}

function derivePromoStatus(promo, now = new Date()) {
  if (!promo?.isEnabled) return "inactive";
  const startAt = new Date(promo.startAt);
  const endAt = new Date(promo.endAt);

  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) return "inactive";
  if (endAt <= now) return "expired";
  if (startAt > now) return "scheduled";
  return "active";
}

async function loadActivePromosForProducts(productIds, now = new Date()) {
  const uniqueIds = [...new Set((productIds || []).map(toObjectIdString).filter(Boolean))];
  if (uniqueIds.length === 0) return [];

  const objectIds = uniqueIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (objectIds.length === 0) return [];

  return Promo.find({
    type: "promo",
    isEnabled: true,
    startAt: { $lte: now },
    endAt: { $gt: now },
    resolvedProductIds: { $in: objectIds },
  })
    .select("name description discountType discountValue startAt endAt resolvedProductIds")
    .lean();
}

function buildPromoMap(productIds, promos) {
  const uniqueIds = [...new Set((productIds || []).map(toObjectIdString).filter(Boolean))];
  const map = new Map();

  for (const productId of uniqueIds) {
    const candidates = (promos || []).filter((promo) =>
      (promo.resolvedProductIds || []).some((id) => toObjectIdString(id) === productId)
    );

    if (candidates.length === 0) continue;

    let chosen = null;
    let lowestPrice = Number.POSITIVE_INFINITY;

    for (const promo of candidates) {
      const samplePrice = 100;
      const pricing = calculateDiscountedPrice(samplePrice, promo.discountType, promo.discountValue);
      if (pricing.discountedPrice < lowestPrice) {
        lowestPrice = pricing.discountedPrice;
        chosen = promo;
      }
    }

    if (chosen) map.set(productId, chosen);
  }

  return map;
}

async function findActiveVoucherByCode(code, now = new Date()) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) return null;

  return Promo.findOne({
    type: "voucher",
    code: normalized,
    isEnabled: true,
    startAt: { $lte: now },
    endAt: { $gt: now },
  }).lean();
}

function getEligibleItemsForCampaign(items = [], campaign = null) {
  if (!campaign) return [];
  if (!Array.isArray(items) || items.length === 0) return [];

  if (campaign.targetMode === "all") {
    return items;
  }

  const allowed = new Set((campaign.resolvedProductIds || []).map((id) => toObjectIdString(id)));
  return items.filter((item) => allowed.has(toObjectIdString(item.product)));
}

function computeVoucherDiscount(campaign, eligibleSubtotal) {
  const subtotal = toMoney(eligibleSubtotal);
  if (!campaign || subtotal <= 0) return 0;

  let discount = 0;
  if (campaign.discountType === "percent") {
    discount = subtotal * (Number(campaign.discountValue || 0) / 100);
  } else {
    discount = Number(campaign.discountValue || 0);
  }

  if (Number.isFinite(Number(campaign.maxDiscountAmount)) && Number(campaign.maxDiscountAmount) > 0) {
    discount = Math.min(discount, Number(campaign.maxDiscountAmount));
  }

  discount = Math.min(discount, subtotal);
  return toMoney(Math.max(0, discount));
}

module.exports = {
  calculateDiscountedPrice,
  derivePromoStatus,
  loadActivePromosForProducts,
  buildPromoMap,
  findActiveVoucherByCode,
  getEligibleItemsForCampaign,
  computeVoucherDiscount,
  toMoney,
};
