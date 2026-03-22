export function getNotificationTarget({ data = {}, isAdmin = false } = {}) {
    const routeHint = String(data.route || "").toLowerCase();
    const typeHint = String(data.type || "").toLowerCase();
    const orderId = data.orderId ? String(data.orderId) : "";
    const productId = data.productId ? String(data.productId) : "";

    if (routeHint === "stock-alert" && productId) {
        return {
            tab: "Home",
            stackScreen: "Product Detail",
            params: { item: { id: productId, _id: productId } },
        };
    }

    if (routeHint === "admin-orders") {
        return {
            tab: "Admin",
            stackScreen: "Order Details",
            params: { orderId },
        };
    }

    if (routeHint === "order-details" || orderId) {
        if (isAdmin) {
            return {
                tab: "Admin",
                stackScreen: "Order Details",
                params: { orderId },
            };
        }

        return {
            tab: "User",
            stackScreen: "Order Details",
            params: { orderId },
        };
    }

    if (routeHint === "notifications" || typeHint === "promo") {
        return {
            tab: "User",
            stackScreen: "Notification Detail",
            params: {},
        };
    }

    return null;
}
