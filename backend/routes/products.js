const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const authJwt = require("../middleware/authJwt");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Wishlist = require("../models/Wishlist");
const Order = require("../models/Order");
const Review = require("../models/Review");
const StockAlert = require("../models/StockAlert");
const User = require("../models/User");
const {
  calculateDiscountedPrice,
  loadActivePromosForProducts,
  buildPromoMap,
} = require("../services/promoPricing");
const { sendToTokens } = require("../services/notifications");
const { sanitizeProfanity } = require("../services/profanityFilter");
const config = require("../config");

const router = express.Router();

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

const uploadReviewImages = upload.array("images", 3);

const STOCK_LOW_THRESHOLD = 10;

async function notifyAdmins(title, body) {
  try {
    const admins = await User.find({ isAdmin: true, pushToken: { $ne: "" } }, "pushToken pushTokenType").lean();
    const tokens = admins
      .filter((a) => a.pushToken)
      .map((a) => ({ token: a.pushToken, type: a.pushTokenType || "fcm" }));
    console.log(`[notifyAdmins] Sending to ${tokens.length} admin(s): "${title}"`);
    await sendToTokens(tokens, { title, body });
  } catch (error) {
    console.error('[notifyAdmins] Error:', error.message);
  }
}

function toMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

async function notifyWishlistUsers(productId, title, body, extraData = {}) {
  const activeWishlistRows = await Wishlist.find({
    product: productId,
    isActive: true,
  }).lean();

  if (activeWishlistRows.length === 0) return { sent: 0 };

  const userIds = [...new Set(activeWishlistRows.map((row) => row.user?.toString()).filter(Boolean))];
  if (userIds.length === 0) return { sent: 0 };

  const users = await User.find(
    { _id: { $in: userIds }, pushToken: { $ne: "" } },
    "pushToken pushTokenType"
  ).lean();

  const tokens = users
    .filter((user) => user.pushToken)
    .map((user) => ({ token: user.pushToken, type: user.pushTokenType || "fcm" }));

  if (tokens.length === 0) return { sent: 0 };

  await sendToTokens(tokens, {
    title,
    body,
    data: {
      route: "notifications",
      type: "wishlist",
      productId: productId?.toString?.() || "",
      ...extraData,
    },
  });

  return { sent: tokens.length };
}

async function handleWishlistSignalsOnProductUpdate(beforeProduct, afterProduct) {
  if (!beforeProduct || !afterProduct) return;

  const priceBefore = Number(beforeProduct.price || 0);
  const priceAfter = Number(afterProduct.price || 0);
  const stockBefore = Number(beforeProduct.countInStock || 0);
  const stockAfter = Number(afterProduct.countInStock || 0);

  if (priceAfter > 0 && priceAfter < priceBefore) {
    await notifyWishlistUsers(
      afterProduct._id,
      "Price drop on your wishlist",
      `${afterProduct.name} is now $${toMoney(priceAfter).toFixed(2)} (was $${toMoney(priceBefore).toFixed(2)}).`,
      { signal: "price_drop", oldPrice: toMoney(priceBefore), newPrice: toMoney(priceAfter) }
    );
  }

  if (stockBefore <= 0 && stockAfter > 0) {
    await notifyWishlistUsers(
      afterProduct._id,
      "Back in stock",
      `${afterProduct.name} is back in stock.`,
      { signal: "back_in_stock" }
    );
  }
}

async function handleWishlistSignalsOnProductDelete(deletedProduct) {
  if (!deletedProduct?._id) return;

  await notifyWishlistUsers(
    deletedProduct._id,
    "Wishlist product removed",
    `${deletedProduct.name || "A wishlisted product"} is no longer available.`,
    { signal: "product_removed" }
  );

  await Wishlist.updateMany(
    { product: deletedProduct._id, isActive: true },
    {
      $set: {
        isActive: false,
        removedReason: "product_deleted",
        removedAt: new Date(),
        lastKnown: {
          name: String(deletedProduct.name || ""),
          image: String(deletedProduct.image || ""),
          price: Number(deletedProduct.price || 0),
        },
      },
    }
  );
}

async function updateStockAlerts(product) {
  const count = Number(product.countInStock || 0);
  const productId = product._id;
  const productName = product.name || "Product";

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
      await notifyAdmins("Out of stock", `${productName} is out of stock.`);
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
      await notifyAdmins("Low stock", `${productName} is low on stock (${count}).`);
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

function buildImageUrl(req, filename) {
  if (!filename) return "";
  return `${req.protocol}://${req.get("host")}/${config.uploadDir}/${filename}`;
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
}

async function refreshProductReviewStats(productId) {
  const aggregation = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: "$product",
        avgRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  if (!aggregation.length) {
    await Product.findByIdAndUpdate(productId, { rating: 0, numReviews: 0 });
    return;
  }

  const avgRating = Number(aggregation[0].avgRating || 0);
  const rounded = Math.round(avgRating * 10) / 10;
  const totalReviews = Number(aggregation[0].totalReviews || 0);

  await Product.findByIdAndUpdate(productId, {
    rating: rounded,
    numReviews: totalReviews,
  });
}

function toObjectIdOrNull(value) {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

async function attachActivePromoPricing(products) {
  const list = Array.isArray(products) ? products : [products];
  const validItems = list.filter(Boolean);
  if (validItems.length === 0) return Array.isArray(products) ? [] : null;

  const productIds = validItems.map((p) => p._id?.toString?.() || p.id).filter(Boolean);
  const promos = await loadActivePromosForProducts(productIds);
  const promoMap = buildPromoMap(productIds, promos);

  const mapped = validItems.map((product) => {
    const plain = typeof product.toObject === "function" ? product.toObject() : product;
    const productId = plain._id?.toString?.() || plain.id;
    const chosenPromo = promoMap.get(productId);

    if (!chosenPromo) {
      return {
        ...plain,
        discountedPrice: Number(plain.price) || 0,
        discountAmount: 0,
        hasActiveDiscount: false,
        activePromo: null,
      };
    }

    const pricing = calculateDiscountedPrice(
      Number(plain.price) || 0,
      chosenPromo.discountType,
      chosenPromo.discountValue
    );

    return {
      ...plain,
      discountedPrice: pricing.discountedPrice,
      discountAmount: pricing.discountAmount,
      hasActiveDiscount: pricing.discountAmount > 0,
      activePromo: {
        id: chosenPromo._id?.toString?.() || chosenPromo.id,
        name: chosenPromo.name,
        description: chosenPromo.description,
        discountType: chosenPromo.discountType,
        discountValue: chosenPromo.discountValue,
        startAt: chosenPromo.startAt,
        endAt: chosenPromo.endAt,
      },
    };
  });

  return Array.isArray(products) ? mapped : mapped[0];
}

async function loadSoldCountsForProductIds(productIds) {
  const ids = (Array.isArray(productIds) ? productIds : [productIds])
    .map((id) => {
      if (!id) return null;
      const raw = id.toString ? id.toString() : String(id);
      return mongoose.Types.ObjectId.isValid(raw) ? new mongoose.Types.ObjectId(raw) : null;
    })
    .filter(Boolean);

  if (ids.length === 0) return new Map();

  const soldRows = await Order.aggregate([
    {
      $match: {
        status: { $ne: "cancelled" },
        "orderItems.product": { $in: ids },
      },
    },
    { $unwind: "$orderItems" },
    {
      $match: {
        "orderItems.product": { $in: ids },
      },
    },
    {
      $group: {
        _id: "$orderItems.product",
        soldCount: { $sum: { $ifNull: ["$orderItems.quantity", 0] } },
      },
    },
  ]);

  const soldMap = new Map();
  soldRows.forEach((row) => {
    soldMap.set(String(row._id), Number(row.soldCount || 0));
  });
  return soldMap;
}

async function attachSoldCounts(products) {
  const list = Array.isArray(products) ? products : [products];
  const validItems = list.filter(Boolean);
  if (validItems.length === 0) return Array.isArray(products) ? [] : null;

  const productIds = validItems
    .map((product) => {
      const plain = typeof product.toObject === "function" ? product.toObject() : product;
      return plain._id?.toString?.() || plain.id;
    })
    .filter(Boolean);

  const soldMap = await loadSoldCountsForProductIds(productIds);

  const mapped = validItems.map((product) => {
    const plain = typeof product.toObject === "function" ? product.toObject() : product;
    const productId = plain._id?.toString?.() || plain.id;
    return {
      ...plain,
      soldCount: Number(soldMap.get(String(productId)) || 0),
    };
  });

  return Array.isArray(products) ? mapped : mapped[0];
}

function getReviewSort(sortKey) {
  const key = String(sortKey || "date_desc").toLowerCase();
  if (key === "date_asc") return { createdAt: 1 };
  if (key === "rating_desc") return { rating: -1, createdAt: -1 };
  if (key === "rating_asc") return { rating: 1, createdAt: -1 };
  return { createdAt: -1 };
}

// GET /products — public, used by home screen
router.get("/", async (_req, res) => {
  try {
    const products = await Product.find().populate("category", "id name color");
    const withPromos = await attachActivePromoPricing(products);
    const withSoldCounts = await attachSoldCounts(withPromos);
    return res.status(200).json(withSoldCounts);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load products" });
  }
});

// GET /products/:id — public
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category", "id name color");
    if (!product) return res.status(404).json({ message: "Product not found" });
    const withPromo = await attachActivePromoPricing(product);
    const withSoldCount = await attachSoldCounts(withPromo);
    return res.status(200).json(withSoldCount);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load product" });
  }
});

// GET /products/:id/reviews — public list with filters
router.get("/:id/reviews", async (req, res) => {
  try {
    const productId = toObjectIdOrNull(req.params.id);
    if (!productId) return res.status(400).json({ message: "Invalid product id" });

    const ratingFilter = Number(req.query.rating || 0);
    const withMedia = parseBoolean(req.query.withMedia, false);
    const filter = { product: productId };

    if (Number.isInteger(ratingFilter) && ratingFilter >= 1 && ratingFilter <= 5) {
      filter.rating = ratingFilter;
    }
    if (withMedia) {
      filter["images.0"] = { $exists: true };
    }

    const reviews = await Review.find(filter)
      .populate("user", "id name image")
      .sort(getReviewSort(req.query.sort));

    return res.status(200).json(reviews);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load reviews" });
  }
});

// GET /products/:id/reviews/me?orderId=... — current user's review for a specific order/product pair
router.get("/:id/reviews/me", authJwt, async (req, res) => {
  try {
    const productId = toObjectIdOrNull(req.params.id);
    const orderId = toObjectIdOrNull(req.query.orderId);
    if (!productId || !orderId) {
      return res.status(400).json({ message: "productId and orderId are required" });
    }

    const review = await Review.findOne({
      product: productId,
      order: orderId,
      user: req.user.userId,
    });

    return res.status(200).json({ review: review || null });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load review" });
  }
});

// POST /products/:id/reviews — create review (auth, max 3 images)
router.post("/:id/reviews", authJwt, uploadReviewImages, async (req, res) => {
  try {
    const productId = toObjectIdOrNull(req.params.id);
    if (!productId) return res.status(400).json({ message: "Invalid product id" });

    const orderId = toObjectIdOrNull(req.body.orderId);
    const rating = Number(req.body.rating);
    const comment = sanitizeProfanity(String(req.body.comment || "").trim());

    if (!orderId) return res.status(400).json({ message: "orderId is required" });
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }
    if (!comment) return res.status(400).json({ message: "Comment is required" });

    const deliveredOrder = await Order.findOne({
      _id: orderId,
      user: req.user.userId,
      status: "delivered",
      "orderItems.product": productId,
    }).lean();

    if (!deliveredOrder) {
      return res.status(403).json({
        message: "You can only review products from your delivered orders",
      });
    }

    const existing = await Review.findOne({
      product: productId,
      order: orderId,
      user: req.user.userId,
    }).lean();

    if (existing) {
      return res.status(409).json({
        message: "You already submitted a review for this product in this order",
      });
    }

    const images = (req.files || []).map((file) => buildImageUrl(req, file.filename)).slice(0, 3);

    const review = await Review.create({
      product: productId,
      order: orderId,
      user: req.user.userId,
      rating,
      comment,
      images,
    });

    await refreshProductReviewStats(productId);

    const populated = await review.populate("user", "id name image");
    return res.status(201).json(populated);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Review already exists for this order" });
    }
    return res.status(500).json({ message: "Failed to create review" });
  }
});

// PUT /products/:id/reviews/:reviewId — update own review only
router.put("/:id/reviews/:reviewId", authJwt, uploadReviewImages, async (req, res) => {
  try {
    const productId = toObjectIdOrNull(req.params.id);
    const reviewId = toObjectIdOrNull(req.params.reviewId);
    if (!productId || !reviewId) return res.status(400).json({ message: "Invalid id" });

    const review = await Review.findOne({ _id: reviewId, product: productId });
    if (!review) return res.status(404).json({ message: "Review not found" });

    if (review.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: "You can edit only your own review" });
    }

    if (req.body.rating !== undefined) {
      const rating = Number(req.body.rating);
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }
      review.rating = rating;
    }

    if (req.body.comment !== undefined) {
      review.comment = sanitizeProfanity(String(req.body.comment || "").trim());
    }

    let retainedImages = review.images;
    if (req.body.existingImages !== undefined) {
      const rawExisting = req.body.existingImages;
      let parsed = [];

      if (Array.isArray(rawExisting)) {
        parsed = rawExisting;
      } else if (typeof rawExisting === "string") {
        try {
          parsed = JSON.parse(rawExisting);
        } catch {
          parsed = [];
        }
      }

      if (Array.isArray(parsed)) {
        retainedImages = parsed
          .map((img) => String(img || "").trim())
          .filter(Boolean);
      }
    }

    const uploadedImages = (req.files || []).map((file) => buildImageUrl(req, file.filename)).slice(0, 3);
    review.images = [...retainedImages, ...uploadedImages].slice(0, 3);

    await review.save();
    await refreshProductReviewStats(productId);

    const populated = await review.populate("user", "id name image");
    return res.status(200).json(populated);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to update review" });
  }
});

// POST /products — admin only, multipart
router.post("/", authJwt, upload.single("image"), async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    const { name, brand, price, description, richDescription, category,
            countInStock, rating, numReviews, isFeatured } = req.body;
    if (!name || !brand || !price || !category || countInStock === undefined) {
      return res.status(400).json({ message: "name, brand, price, category and countInStock are required" });
    }
    const image = req.file ? buildImageUrl(req, req.file.filename) : "";
    const product = await Product.create({
      name, brand, price: Number(price), description, richDescription,
      category, countInStock: Number(countInStock),
      rating: Number(rating || 0), numReviews: Number(numReviews || 0),
      isFeatured: isFeatured === "true" || isFeatured === true,
      image,
    });
    const populated = await product.populate("category", "id name color");
    await updateStockAlerts(product);
    return res.status(201).json(populated);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to create product" });
  }
});

// PUT /products/:id — admin only, multipart
router.put("/:id", authJwt, upload.single("image"), async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    const existing = await Product.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Product not found" });

    const { name, brand, price, description, richDescription, category,
            countInStock, rating, numReviews, isFeatured } = req.body;
    const image = req.file ? buildImageUrl(req, req.file.filename) : existing.image;

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name: name || existing.name,
        brand: brand || existing.brand,
        price: price !== undefined ? Number(price) : existing.price,
        description: description !== undefined ? description : existing.description,
        richDescription: richDescription !== undefined ? richDescription : existing.richDescription,
        category: category || existing.category,
        countInStock: countInStock !== undefined ? Number(countInStock) : existing.countInStock,
        rating: rating !== undefined ? Number(rating) : existing.rating,
        numReviews: numReviews !== undefined ? Number(numReviews) : existing.numReviews,
        isFeatured: isFeatured !== undefined ? (isFeatured === "true" || isFeatured === true) : existing.isFeatured,
        image,
      },
      { new: true }
    ).populate("category", "id name color");

    await updateStockAlerts(updated);
    await handleWishlistSignalsOnProductUpdate(existing, updated);

    return res.status(200).json(updated);
  } catch (error) {
    console.error('[PUT /products/:id] Error:', error.message, error.stack);
    return res.status(500).json({ message: "Failed to update product", error: error.message });
  }
});

// DELETE /products/:id — admin only
router.delete("/:id", authJwt, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Product not found" });
    await handleWishlistSignalsOnProductDelete(deleted);
    return res.status(200).json({ success: true });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to delete product" });
  }
});

module.exports = router;
