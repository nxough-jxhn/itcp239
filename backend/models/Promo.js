const mongoose = require("mongoose");

const promoSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["promo", "voucher"],
      default: "promo",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    discountType: {
      type: String,
      enum: ["percent", "fixed"],
      required: true,
    },
    discountValue: { type: Number, required: true, min: 0 },
    durationPreset: {
      type: String,
      enum: ["manual", "3d", "7d", "1m"],
      default: "manual",
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      index: { unique: true, sparse: true },
    },
    usagePolicy: {
      type: String,
      enum: ["none", "one_time_total", "global_limit", "per_user_limit"],
      default: "none",
    },
    globalLimit: { type: Number, default: null },
    perUserLimit: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
    maxDiscountAmount: { type: Number, default: null },
    minOrderAmount: { type: Number, default: 0 },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    targetMode: {
      type: String,
      enum: ["products", "categories", "all"],
      required: true,
    },
    targetProductIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    targetCategoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    resolvedProductIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    conflictStrategy: {
      type: String,
      enum: ["none", "exclude_conflicts", "override_conflicts"],
      default: "none",
    },
    isEnabled: { type: Boolean, default: true },
    lastNotifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

promoSchema.virtual("id").get(function idGetter() {
  return this._id.toString();
});

promoSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model("Promo", promoSchema);
