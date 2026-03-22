const express = require("express");
const mongoose = require("mongoose");
const authJwt = require("../middleware/authJwt");
const Order = require("../models/Order");
const Review = require("../models/Review");
const Product = require("../models/Product");
const StockAlert = require("../models/StockAlert");
const VoucherRedemption = require("../models/VoucherRedemption");
const User = require("../models/User");
const { sendToTokens } = require("../services/notifications");
const {
  calculateDiscountedPrice,
  loadActivePromosForProducts,
  buildPromoMap,
  findActiveVoucherByCode,
  getEligibleItemsForCampaign,
  computeVoucherDiscount,
  toMoney,
} = require("../services/promoPricing");

const router = express.Router();

const STATUS = {
  PENDING: "pending",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};
const STOCK_LOW_THRESHOLD = 10;

async function syncStockAlertForProduct(productDoc) {
  const productId = productDoc?._id;
  if (!productId) return;

  const count = Number(productDoc.countInStock || 0);

  if (count <= 0) {
    await StockAlert.updateMany(
      { product: productId, resolved: false, type: "low" },
      { resolved: true }
    );

    const existingOut = await StockAlert.findOne({ product: productId, resolved: false, type: "out" });
    if (!existingOut) {
      await StockAlert.create({
        product: productId,
        type: "out",
        threshold: STOCK_LOW_THRESHOLD,
        countInStock: count,
      });
    } else if (existingOut.countInStock !== count) {
      existingOut.countInStock = count;
      await existingOut.save();
    }
    return;
  }

  if (count <= STOCK_LOW_THRESHOLD) {
    await StockAlert.updateMany(
      { product: productId, resolved: false, type: "out" },
      { resolved: true }
    );

    const existingLow = await StockAlert.findOne({ product: productId, resolved: false, type: "low" });
    if (!existingLow) {
      await StockAlert.create({
        product: productId,
        type: "low",
        threshold: STOCK_LOW_THRESHOLD,
        countInStock: count,
      });
    } else if (existingLow.countInStock !== count) {
      existingLow.countInStock = count;
      await existingLow.save();
    }
    return;
  }

  await StockAlert.updateMany(
    { product: productId, resolved: false },
    { resolved: true }
  );
}

function normalizeStatus(value) {
  if (!value) return "";
  const lowered = String(value).toLowerCase();
  if (lowered === "3") return STATUS.PENDING;
  if (lowered === "2") return STATUS.SHIPPED;
  if (lowered === "1") return STATUS.DELIVERED;
  return lowered;
}

async function sendOrderStatusNotification({ recipientUserId, orderId, status, customBody }) {
  const recipient = await User.findById(recipientUserId).lean();
  if (!recipient?.pushToken) return false;

  const recipientName = String(recipient?.name || "").trim() || "there";
  const normalizedStatus = normalizeStatus(status) || STATUS.PENDING;
  const body = String(customBody || "").trim()
    || `Your order is currently ${normalizedStatus}. Check the details now.`;

  await sendToTokens([{ token: recipient.pushToken, type: recipient.pushTokenType || "fcm" }], {
    title: `Hey there ${recipientName}`,
    body,
    data: { orderId: String(orderId), status: normalizedStatus, route: "order-details" },
  });

  return true;
}

function aggregateProductQuantities(items = []) {
  const quantityMap = new Map();

  (Array.isArray(items) ? items : []).forEach((item) => {
    const productId = item?.product?.toString?.() || item?.product;
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) return;

    const quantity = Math.max(1, Number(item?.quantity || 1));
    quantityMap.set(String(productId), Number(quantityMap.get(String(productId)) || 0) + quantity);
  });

  return [...quantityMap.entries()].map(([productId, quantity]) => ({ productId, quantity }));
}

async function reserveStockForItems(items = []) {
  const aggregated = aggregateProductQuantities(items);
  const appliedReservations = [];

  for (const entry of aggregated) {
    const reserved = await Product.findOneAndUpdate(
      { _id: entry.productId, countInStock: { $gte: entry.quantity } },
      { $inc: { countInStock: -entry.quantity } },
      { new: true, projection: "_id name countInStock" }
    ).lean();

    if (!reserved) {
      for (const applied of appliedReservations) {
        const rolledBack = await Product.findByIdAndUpdate(
          applied.productId,
          { $inc: { countInStock: applied.quantity } },
          { new: true, projection: "_id countInStock" }
        ).lean();
        if (rolledBack) {
          await syncStockAlertForProduct(rolledBack);
        }
      }

      const product = await Product.findById(entry.productId, "name countInStock").lean();
      const productName = product?.name || "Product";
      const available = Math.max(0, Number(product?.countInStock || 0));
      throw new Error(`Insufficient stock for ${productName}. Available: ${available}`);
    }

    await syncStockAlertForProduct(reserved);
    appliedReservations.push(entry);
  }

  return appliedReservations;
}

async function restoreStockForItems(items = []) {
  const aggregated = aggregateProductQuantities(items);
  for (const entry of aggregated) {
    const restored = await Product.findByIdAndUpdate(
      entry.productId,
      { $inc: { countInStock: entry.quantity } },
      { new: true, projection: "_id countInStock" }
    ).lean();
    if (restored) {
      await syncStockAlertForProduct(restored);
    }
  }
}

async function attachReviewFlagsForUserOrders(userId, orders) {
  if (!Array.isArray(orders) || orders.length === 0) return orders;

  const orderIds = orders.map((order) => order._id).filter(Boolean);
  const existingReviews = await Review.find(
    { user: userId, order: { $in: orderIds } },
    "order product"
  ).lean();

  const reviewSet = new Set(
    existingReviews.map((review) => `${review.order.toString()}:${review.product.toString()}`)
  );

  return orders.map((order) => {
    const delivered = normalizeStatus(order.status) === STATUS.DELIVERED;
    const orderId = order._id?.toString();
    const enrichedItems = (order.orderItems || []).map((item) => {
      const productId = item.product?.toString?.() || item.product;
      const key = `${orderId}:${productId}`;
      const hasUserReview = reviewSet.has(key);
      return {
        ...item,
        hasUserReview,
        canLeaveReview: delivered && !hasUserReview,
      };
    });

    return {
      ...order,
      orderItems: enrichedItems,
    };
  });
}

// POST /orders — authenticated user places an order
router.post("/", authJwt, async (req, res) => {
  let reservedStockAdjustments = [];
  let createdOrderId = null;

  try {
    const { orderItems, voucherCode } = req.body;

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ message: "Order must contain at least one item" });
    }

    const userProfile = await User.findById(req.user.userId).lean();
    if (!userProfile) {
      return res.status(404).json({ message: "User not found" });
    }

    const shippingAddress1 = String(userProfile.deliveryAddress1 || "").trim();
    const shippingAddress2 = String(userProfile.deliveryAddress2 || "").trim();
    const city = String(userProfile.deliveryCity || "").trim();
    const zip = String(userProfile.deliveryZip || "").trim();
    const country = String(userProfile.deliveryCountry || "").trim();
    const phone = String(userProfile.phone || "").trim();

    if (!phone || !shippingAddress1 || !city || !zip || !country) {
      return res.status(400).json({
        message: "Complete your profile delivery details first (phone, address, city, zip, country)",
      });
    }

    // product id may come as item.id, item._id, or item.product
    const requestedItems = orderItems.map((item) => {
      const productId =
        item.product ||
        item.id ||
        (typeof item._id === "string" ? item._id : item._id?.toString());

      if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
        throw new Error(`Invalid product reference: ${JSON.stringify(productId)}`);
      }

      return {
        product: productId,
        quantity: Number(item.quantity) || 1,
      };
    });

    const productIds = requestedItems.map((item) => item.product);
    const uniqueProductIds = [...new Set(productIds)];
    const productDocs = await Product.find({ _id: { $in: uniqueProductIds } }, "name image price countInStock").lean();
    const productMap = new Map(productDocs.map((product) => [product._id.toString(), product]));

    if (productDocs.length !== uniqueProductIds.length) {
      return res.status(400).json({ message: "One or more products no longer exist" });
    }

    const activePromos = await loadActivePromosForProducts(productIds);
    const promoMap = buildPromoMap(productIds, activePromos);

    const mappedItems = requestedItems.map((item) => {
      const product = productMap.get(item.product);
      if (!product) {
        throw new Error(`Product not found during checkout: ${item.product}`);
      }

      const promo = promoMap.get(item.product);
      const pricing = promo
        ? calculateDiscountedPrice(Number(product.price) || 0, promo.discountType, promo.discountValue)
        : calculateDiscountedPrice(Number(product.price) || 0, "fixed", 0);

      return {
        product: item.product,
        name: product.name || "",
        basePrice: Number(product.price) || 0,
        price: pricing.discountedPrice,
        image: product.image || "",
        quantity: item.quantity,
      };
    });

    const subtotalBase = toMoney(
      mappedItems.reduce((sum, item) => sum + (Number(item.basePrice) || 0) * (Number(item.quantity) || 1), 0)
    );

    const promoSubtotal = toMoney(
      mappedItems.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0)
    );

    let voucherDiscountTotal = 0;
    let appliedVoucher = null;

    const normalizedVoucherCode = String(voucherCode || "").trim().toUpperCase();
    if (normalizedVoucherCode) {
      const voucher = await findActiveVoucherByCode(normalizedVoucherCode);
      if (!voucher) {
        return res.status(400).json({ message: "Voucher not found or not active" });
      }

      const usagePolicy = String(voucher.usagePolicy || "none");
      if (usagePolicy === "one_time_total" && Number(voucher.usedCount || 0) >= 1) {
        return res.status(400).json({ message: "Voucher already used" });
      }
      if (usagePolicy === "global_limit" && Number(voucher.usedCount || 0) >= Number(voucher.globalLimit || 0)) {
        return res.status(400).json({ message: "Voucher reached global usage limit" });
      }
      if (usagePolicy === "per_user_limit") {
        const usedByUser = await VoucherRedemption.countDocuments({ campaign: voucher._id, user: req.user.userId });
        if (usedByUser >= Number(voucher.perUserLimit || 0)) {
          return res.status(400).json({ message: "Voucher usage limit reached for this user" });
        }
      }

      if (promoSubtotal < Number(voucher.minOrderAmount || 0)) {
        return res.status(400).json({ message: `Minimum order amount is ${voucher.minOrderAmount}` });
      }

      const voucherEligibleItems = getEligibleItemsForCampaign(
        mappedItems.map((item) => ({
          product: item.product,
          lineTotal: toMoney((Number(item.price) || 0) * (Number(item.quantity) || 1)),
        })),
        voucher
      );

      const eligibleSubtotal = toMoney(voucherEligibleItems.reduce((sum, item) => sum + item.lineTotal, 0));
      if (eligibleSubtotal <= 0) {
        return res.status(400).json({ message: "Voucher does not apply to items in this order" });
      }

      voucherDiscountTotal = computeVoucherDiscount(voucher, eligibleSubtotal);
      appliedVoucher = {
        campaignId: voucher._id,
        code: voucher.code,
        discountType: voucher.discountType,
        discountValue: Number(voucher.discountValue || 0),
        discountAmount: voucherDiscountTotal,
      };
    }

    // Calculate total price server-side to prevent tampering
    const promoDiscountTotal = toMoney(subtotalBase - promoSubtotal);
    const totalPrice = toMoney(Math.max(0, promoSubtotal - voucherDiscountTotal));

    // Reserve stock immediately at order placement (pending) to avoid overselling.
    reservedStockAdjustments = await reserveStockForItems(mappedItems);

    const order = await Order.create({
      orderItems: mappedItems,
      shippingAddress1,
      shippingAddress2,
      city,
      zip,
      country,
      phone,
      status: STATUS.PENDING,
      stockReserved: true,
      subtotalBase,
      promoDiscountTotal,
      voucherDiscountTotal,
      totalPrice,
      appliedVoucher: appliedVoucher || undefined,
      user: req.user.userId,
      dateOrdered: new Date(),
    });
    createdOrderId = order._id;

    if (appliedVoucher?.campaignId) {
      await VoucherRedemption.create({
        campaign: appliedVoucher.campaignId,
        order: order._id,
        user: req.user.userId,
        code: appliedVoucher.code,
        discountAmount: appliedVoucher.discountAmount,
      });

      await mongoose.model("Promo").findByIdAndUpdate(appliedVoucher.campaignId, { $inc: { usedCount: 1 } });
    }

    try {
      const admins = await User.find({ isAdmin: true, pushToken: { $ne: "" } }, "pushToken pushTokenType").lean();
      const adminTokens = admins
        .filter((a) => a.pushToken)
        .map((a) => ({ token: a.pushToken, type: a.pushTokenType || "fcm" }));
      await sendToTokens(adminTokens, {
        title: "New order placed",
        body: `Order ${order.id} has been placed.`,
        data: { orderId: order.id, route: "admin-orders" },
      });
    } catch (notifyError) {
      console.error("[orders] admin notification error:", notifyError?.message || notifyError);
    }

    return res.status(201).json(order);
  } catch (error) {
    console.error("[orders] POST error:", error.message);

    if (!createdOrderId && reservedStockAdjustments.length > 0) {
      try {
        await restoreStockForItems(reservedStockAdjustments.map((entry) => ({
          product: entry.productId,
          quantity: entry.quantity,
        })));
      } catch (_rollbackError) {
        // Best effort rollback; keep original error response.
      }
    }

    if (String(error?.message || "").toLowerCase().includes("insufficient stock")) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message || "Failed to create order" });
  }
});

// GET /orders — admin sees all, user sees own orders (newest first)
router.get("/", authJwt, async (req, res) => {
  try {
    const filter = req.user?.isAdmin ? {} : { user: req.user.userId };
    const orderDocs = await Order.find(filter)
      .populate("user", "id name email")
      .sort({ dateOrdered: -1 });

    let orders = orderDocs.map((order) => order.toObject());
    if (!req.user?.isAdmin) {
      orders = await attachReviewFlagsForUserOrders(req.user.userId, orders);
    }

    return res.status(200).json(orders);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load orders" });
  }
});

// GET /orders/:id — auth required (admin or order owner)
router.get("/:id", authJwt, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("user", "id name email");
    if (!order) return res.status(404).json({ message: "Order not found" });

    const isOwner = order.user?._id?.toString() === req.user.userId;
    if (!req.user.isAdmin && !isOwner) {
      return res.status(403).json({ message: "Forbidden" });
    }

    let orderPayload = order.toObject();
    if (!req.user?.isAdmin) {
      const [enriched] = await attachReviewFlagsForUserOrders(req.user.userId, [orderPayload]);
      orderPayload = enriched;
    }

    return res.status(200).json(orderPayload);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load order" });
  }
});

// PUT /orders/:id — admin or owner updates status with rules
router.put("/:id", authJwt, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const existing = await Order.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Order not found" });

    const isOwner = existing.user?.toString() === req.user.userId;
    if (!req.user?.isAdmin && !isOwner) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const currentStatus = normalizeStatus(existing.status);
    const desiredStatus = normalizeStatus(status);

    if (![STATUS.PENDING, STATUS.SHIPPED, STATUS.DELIVERED, STATUS.CANCELLED].includes(desiredStatus)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if ([STATUS.CANCELLED, STATUS.DELIVERED].includes(currentStatus)) {
      return res.status(409).json({ message: "Finalized orders cannot be updated" });
    }

    if (desiredStatus === currentStatus) {
      const unchanged = await existing.populate("user", "id name email");
      return res.status(200).json(unchanged);
    }

    const adminTransitions = {
      [STATUS.PENDING]: [STATUS.SHIPPED, STATUS.CANCELLED],
      [STATUS.SHIPPED]: [STATUS.CANCELLED],
      [STATUS.DELIVERED]: [],
      [STATUS.CANCELLED]: [],
    };

    const userTransitions = {
      [STATUS.PENDING]: [STATUS.CANCELLED],
      [STATUS.SHIPPED]: [STATUS.DELIVERED, STATUS.CANCELLED],
      [STATUS.DELIVERED]: [],
      [STATUS.CANCELLED]: [],
    };

    const allowed = req.user?.isAdmin
      ? adminTransitions[currentStatus] || []
      : userTransitions[currentStatus] || [];

    if (!allowed.includes(desiredStatus)) {
      return res.status(403).json({ message: "Status change not allowed" });
    }

    const updateDoc = { status: desiredStatus };

    // Legacy compatibility: if old orders were never reserved, reserve right before delivery.
    if (desiredStatus === STATUS.DELIVERED && currentStatus !== STATUS.DELIVERED && existing.stockReserved !== true) {
      await reserveStockForItems(existing.orderItems || []);
      updateDoc.stockReserved = true;
    }

    // Restore reserved stock only when cancellation happens.
    if (desiredStatus === STATUS.CANCELLED && currentStatus !== STATUS.CANCELLED && existing.stockReserved === true) {
      await restoreStockForItems(existing.orderItems || []);
      updateDoc.stockReserved = false;
    }

    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      updateDoc,
      { new: true }
    ).populate("user", "id name email");

    await sendOrderStatusNotification({
      recipientUserId: existing.user,
      orderId: updated.id,
      status: desiredStatus,
      customBody: `Your order status is now ${desiredStatus}. Check the details now.`,
    });

    return res.status(200).json(updated);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to update order" });
  }
});

// POST /orders/:id/notify — admin sends manual order status reminder notification
router.post("/:id/notify", authJwt, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const existing = await Order.findById(req.params.id).populate("user", "id name email");
    if (!existing) return res.status(404).json({ message: "Order not found" });

    const normalizedStatus = normalizeStatus(existing.status) || STATUS.PENDING;
    const sent = await sendOrderStatusNotification({
      recipientUserId: existing.user?._id,
      orderId: existing.id,
      status: normalizedStatus,
      customBody: `Your order is currently ${normalizedStatus}. Check the details now.`,
    });

    if (!sent) {
      return res.status(200).json({
        ok: false,
        message: "User has no registered push token",
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Notification sent",
    });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to send notification" });
  }
});

module.exports = router;
