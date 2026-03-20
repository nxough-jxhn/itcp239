const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    isActive: { type: Boolean, default: true },
    removedReason: {
      type: String,
      enum: ["", "user_removed", "product_deleted", "product_deactivated"],
      default: "",
    },
    removedAt: { type: Date, default: null },
    lastKnown: {
      name: { type: String, default: "" },
      image: { type: String, default: "" },
      price: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

wishlistSchema.index({ user: 1, product: 1 }, { unique: true });

wishlistSchema.virtual("id").get(function idGetter() {
  return this._id.toString();
});

wishlistSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model("Wishlist", wishlistSchema);
