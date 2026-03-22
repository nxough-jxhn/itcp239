const express = require("express");
const authJwt = require("../middleware/authJwt");
const StockAlert = require("../models/StockAlert");

const router = express.Router();

// GET /stock-alerts — admin only
router.get("/", authJwt, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const includeResolved = String(req.query.includeResolved || "").toLowerCase() === "true";
    const filter = includeResolved ? {} : { resolved: false };

    const alerts = await StockAlert.find(filter)
      .populate({
        path: "product",
        select: "id name brand price countInStock image description category",
        populate: { path: "category", select: "id name" },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json(alerts);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load stock alerts" });
  }
});

module.exports = router;
