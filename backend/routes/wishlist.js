const express = require("express");
const mongoose = require("mongoose");
const authJwt = require("../middleware/authJwt");
const Wishlist = require("../models/Wishlist");
const Product = require("../models/Product");
const Order = require("../models/Order");

const router = express.Router();

function toObjectIdOrNull(value) {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

function buildWishlistItemResponse(item) {
  const product = item?.product || null;
  const isRemoved = !item?.isActive || !product;

  return {
    id: item.id || item._id?.toString(),
    user: item.user,
    productId: product?._id?.toString?.() || item?.product?.toString?.() || null,
    isActive: item?.isActive === true && !!product,
    removedReason: item?.removedReason || "",
    removedAt: item?.removedAt || null,
    createdAt: item?.createdAt,
    updatedAt: item?.updatedAt,
    product: product
      ? {
                  id: product._id?.toString?.() || product.id,
          name: product.name || "",
                  description: product.description || "",
          image: product.image || "",
          price: Number(product.price || 0),
          countInStock: Number(product.countInStock || 0),
                  rating: Number(product.rating || 0),
                  numReviews: Number(product.numReviews || 0),
                  soldCount: Number(product.soldCount || 0),
        }
      : {
          id: null,
          name: item?.lastKnown?.name || "Removed product",
                  description: "",
          image: item?.lastKnown?.image || "",
          price: Number(item?.lastKnown?.price || 0),
          countInStock: 0,
                  rating: 0,
                  numReviews: 0,
                  soldCount: 0,
        },
    isRemoved,
  };
}

async function loadSoldCountsForProductIds(productIds) {
  const ids = (productIds || [])
    .map((id) => (mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null))
    .filter(Boolean);

  if (ids.length === 0) return new Map();

  const soldRows = await Order.aggregate([
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

router.get("/ids", authJwt, async (req, res) => {
  try {
    const rows = await Wishlist.find({ user: req.user.userId, isActive: true }, "product").lean();
    const ids = rows
      .map((row) => row.product?.toString?.())
      .filter(Boolean);
    return res.status(200).json({ ids: [...new Set(ids)] });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load wishlist ids" });
  }
});

router.get("/", authJwt, async (req, res) => {
  try {
    const includeRemoved = String(req.query?.includeRemoved || "false").toLowerCase() === "true";

    const query = { user: req.user.userId };
    if (!includeRemoved) query.isActive = true;

    const entries = await Wishlist.find(query)
      .sort({ updatedAt: -1 })
      .populate("product", "name description image price countInStock rating numReviews")
      .lean();

    const productIds = entries
      .map((entry) => entry?.product?._id?.toString?.())
      .filter(Boolean);
    const soldMap = await loadSoldCountsForProductIds(productIds);

    const entriesWithSoldCount = entries.map((entry) => {
      if (!entry?.product?._id) return entry;
      return {
        ...entry,
        product: {
          ...entry.product,
          soldCount: Number(soldMap.get(String(entry.product._id)) || 0),
        },
      };
    });

    const mapped = entriesWithSoldCount.map(buildWishlistItemResponse);

    if (!includeRemoved) {
      // If a product was hard-deleted outside the app flow, hide and soft-mark it as removed.
      const brokenActiveProductIds = mapped
        .filter((entry) => entry.isRemoved && entry.productId)
        .map((entry) => entry.productId);

      if (brokenActiveProductIds.length > 0) {
        await Wishlist.updateMany(
          {
            user: req.user.userId,
            product: { $in: brokenActiveProductIds },
            isActive: true,
          },
          {
            $set: {
              isActive: false,
              removedReason: "product_deleted",
              removedAt: new Date(),
            },
          }
        );
      }

      return res.status(200).json(mapped.filter((entry) => !entry.isRemoved));
    }

    return res.status(200).json(mapped);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load wishlist" });
  }
});

router.post("/toggle/:productId", authJwt, async (req, res) => {
  try {
    const productId = toObjectIdOrNull(req.params.productId);
    if (!productId) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const product = await Product.findById(productId).lean();
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const existing = await Wishlist.findOne({ user: req.user.userId, product: productId });

    if (!existing) {
      const created = await Wishlist.create({
        user: req.user.userId,
        product: productId,
        isActive: true,
        removedReason: "",
        removedAt: null,
        lastKnown: {
          name: String(product.name || ""),
          image: String(product.image || ""),
          price: Number(product.price || 0),
        },
      });

      return res.status(201).json({ success: true, wishlisted: true, item: buildWishlistItemResponse({ ...created.toJSON(), product }) });
    }

    if (existing.isActive) {
      existing.isActive = false;
      existing.removedReason = "user_removed";
      existing.removedAt = new Date();
      await existing.save();
      return res.status(200).json({ success: true, wishlisted: false });
    }

    existing.isActive = true;
    existing.removedReason = "";
    existing.removedAt = null;
    existing.lastKnown = {
      name: String(product.name || ""),
      image: String(product.image || ""),
      price: Number(product.price || 0),
    };
    await existing.save();

    return res.status(200).json({ success: true, wishlisted: true, item: buildWishlistItemResponse({ ...existing.toJSON(), product }) });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to update wishlist" });
  }
});

router.delete("/:productId", authJwt, async (req, res) => {
  try {
    const productId = toObjectIdOrNull(req.params.productId);
    if (!productId) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    await Wishlist.findOneAndUpdate(
      { user: req.user.userId, product: productId },
      { $set: { isActive: false, removedReason: "user_removed", removedAt: new Date() } }
    );

    return res.status(200).json({ success: true });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to remove from wishlist" });
  }
});

module.exports = router;
