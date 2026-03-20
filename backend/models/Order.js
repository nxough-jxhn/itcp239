const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, default: "" },
  quantity: { type: Number, required: true, default: 1 },
});

orderItemSchema.virtual("id").get(function idGetter() {
  return this._id.toString();
});

orderItemSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  },
});

const orderSchema = new mongoose.Schema(
  {
    orderItems: [orderItemSchema],
    shippingAddress1: { type: String, required: true },
    shippingAddress2: { type: String, default: "" },
    city: { type: String, required: true },
    zip: { type: String, required: true },
    country: { type: String, required: true },
    phone: { type: String, required: true },
    status: { type: String, default: "pending" },
    stockReserved: { type: Boolean, default: false },
    subtotalBase: { type: Number, default: 0 },
    promoDiscountTotal: { type: Number, default: 0 },
    voucherDiscountTotal: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    appliedVoucher: {
      campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Promo", default: null },
      code: { type: String, default: "" },
      discountType: { type: String, default: "" },
      discountValue: { type: Number, default: 0 },
      discountAmount: { type: Number, default: 0 },
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    dateOrdered: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

orderSchema.virtual("id").get(function idGetter() {
  return this._id.toString();
});

orderSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model("Order", orderSchema);
