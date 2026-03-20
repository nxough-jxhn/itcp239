const mongoose = require("mongoose");

const voucherRedemptionSchema = new mongoose.Schema(
  {
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: "Promo", required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    discountAmount: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

voucherRedemptionSchema.index({ campaign: 1, user: 1, createdAt: -1 });

voucherRedemptionSchema.virtual("id").get(function idGetter() {
  return this._id.toString();
});

voucherRedemptionSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model("VoucherRedemption", voucherRedemptionSchema);
