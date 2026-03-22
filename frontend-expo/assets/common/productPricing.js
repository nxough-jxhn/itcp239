export function getProductPricing(product) {
    const originalPrice = Number(product?.price || 0);
    const discountedRaw = Number(product?.discountedPrice);
    const discountedPrice = Number.isFinite(discountedRaw) ? discountedRaw : originalPrice;

    const isSale =
        product?.hasActiveDiscount === true
        || (Number.isFinite(discountedRaw) && discountedPrice < originalPrice);

    const percentOff = product?.activePromo?.discountType === "percent"
        ? Math.max(0, Math.round(Number(product?.activePromo?.discountValue || 0)))
        : originalPrice > 0
            ? Math.max(0, Math.round(((originalPrice - discountedPrice) / originalPrice) * 100))
            : 0;

    return {
        originalPrice,
        discountedPrice,
        displayPrice: isSale ? discountedPrice : originalPrice,
        isSale,
        percentOff,
    };
}
