import React, { useContext } from "react";
import {
    StyleSheet,
    View,
    Dimensions,
    Image,
    Text,
    TouchableOpacity,
} from "react-native";
import { addToCart } from "../../Redux/Actions/cartActions";
import { useDispatch, useSelector } from "react-redux";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { toggleWishlistProduct } from "../../Redux/Actions/wishlistActions";
import { useNavigation } from "@react-navigation/native";
import AuthGlobal from "../../Context/Store/AuthGlobal";

var { width } = Dimensions.get("window");

// Product images come from the API (item.image). Fallback when no image: placeholder URL.
const FALLBACK_IMAGE = "https://cdn.pixabay.com/photo/2012/04/01/17/29/box-23649_960_720.png";

const formatCompactCount = (value) => {
    const n = Number(value || 0);
    if (!Number.isFinite(n) || n <= 0) return "0";
    if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, "")}m+`;
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k+`;
    return String(Math.floor(n));
};

const ProductCard = (props) => {
    const { name, price, image, countInStock, discountedPrice, hasActiveDiscount, activePromo } = props;
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const context = useContext(AuthGlobal);
    const isAdmin = context?.stateUser?.user?.isAdmin === true;
    const productId = String(props.id || props._id || "");
    const wishlistIds = useSelector((state) => state.wishlist?.ids || []);
    const isWishlisted = wishlistIds.includes(productId);

    const onToggleWishlist = async (event) => {
        event?.stopPropagation?.();
        if (!productId) return;
        const result = await dispatch(toggleWishlistProduct(productId));
        if (result?.authRequired) {
            navigation.navigate("User", { screen: "Login" });
            return;
        }
        if (!result?.ok) {
            Toast.show({ topOffset: 60, type: "error", text1: result?.message || "Wishlist update failed" });
            return;
        }

        Toast.show({
            topOffset: 60,
            type: "success",
            text1: result.wishlisted ? "Added to wishlist" : "Removed from wishlist",
        });
    };

    const originalPrice = Number(price || 0);
    const salePrice = Number.isFinite(Number(discountedPrice)) ? Number(discountedPrice) : originalPrice;
    const isSale = hasActiveDiscount === true || salePrice < originalPrice;
    const percentOff = activePromo?.discountType === "percent"
        ? Math.round(Number(activePromo?.discountValue || 0))
        : originalPrice > 0
            ? Math.round(((originalPrice - salePrice) / originalPrice) * 100)
            : 0;
    const totalOrders = Number(props?.totalOrders || props?.soldCount || props?.numSold || props?.sold || props?.ordersCount || props?.numReviews || 0);

    return (
        <View style={styles.container}>
            {!isAdmin ? (
                <TouchableOpacity style={styles.wishlistBtn} onPress={onToggleWishlist}>
                    <Ionicons
                        name={isWishlisted ? "heart" : "heart-outline"}
                        size={15}
                        color={isWishlisted ? "#d16d6d" : "#6d6d6d"}
                    />
                </TouchableOpacity>
            ) : null}
            {isSale ? (
                <View style={styles.saleBadge}>
                    <Text style={styles.saleBadgeText}>SALE</Text>
                </View>
            ) : null}
            <Image
                style={styles.image}
                resizeMode="contain"
                source={{ uri: image || FALLBACK_IMAGE }}
            />
            <View style={styles.card} />
            <Text style={styles.title}>
                {name.length > 15 ? name.substring(0, 12) + "..." : name}
            </Text>
            <View style={styles.metaRow}>
                <Text style={styles.metaText}>{formatCompactCount(totalOrders)} Sold</Text>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.metaText}>Stock {Number(countInStock || 0)}</Text>
            </View>
            <View style={styles.bottomRow}>
                <View style={styles.priceWrap}>
                    {isSale ? (
                        <Text style={styles.oldPrice}>
                            ${originalPrice.toFixed(2)}
                            {percentOff > 0 ? `  (${percentOff}% off)` : ""}
                        </Text>
                    ) : null}
                    <Text style={styles.price}>${(isSale ? salePrice : originalPrice).toFixed(2)}</Text>
                </View>
                {countInStock > 0 && !isAdmin ? (
                    <TouchableOpacity
                        style={styles.addCircleBtn}
                        onPress={() => {
                            dispatch(
                                addToCart({
                                    ...props,
                                    quantity: 1,
                                    price: isSale ? salePrice : originalPrice,
                                    originalPrice,
                                })
                            );
                            Toast.show({
                                topOffset: 60,
                                type: "success",
                                text1: `${name} added to Cart`,
                            });
                        }}
                    >
                        <Ionicons name="cart-outline" size={16} color="#fff" />
                    </TouchableOpacity>
                ) : null}
            </View>
            {countInStock <= 0 && !isAdmin ? (
                <Text style={styles.unavailableText}>Unavailable</Text>
            ) : isAdmin ? (
                <Text style={styles.adminText}>Admin mode</Text>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: width / 2 - 18,
        minHeight: 208,
        padding: 8,
        borderRadius: 16,
        marginTop: 8,
        marginBottom: 8,
        marginLeft: 6,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#e8e8e8",
        elevation: 0,
        backgroundColor: "white",
    },
    saleBadge: {
        position: "absolute",
        top: 12,
        left: 12,
        zIndex: 3,
        backgroundColor: "#e8f8ea",
        borderRadius: 10,
        paddingHorizontal: 7,
        paddingVertical: 2,
    },
    wishlistBtn: {
        position: "absolute",
        top: 11,
        right: 11,
        zIndex: 4,
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#d7d7d7",
        backgroundColor: "rgba(255,255,255,0.9)",
    },
    saleBadgeText: {
        color: "#1e7a35",
        fontSize: 9,
        fontWeight: "800",
    },
    image: {
        width: "100%",
        height: 96,
        backgroundColor: "#f3f3f3",
        borderRadius: 14,
        marginBottom: 8,
    },
    card: {
        display: "none",
    },
    title: {
        fontWeight: "bold",
        fontSize: 15,
        textAlign: "left",
        width: "100%",
        color: "#111",
    },
    metaRow: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        marginTop: 3,
    },
    metaText: {
        color: "#666",
        fontSize: 11,
        fontWeight: "600",
    },
    metaDot: {
        color: "#9a9a9a",
        marginHorizontal: 5,
        fontSize: 10,
    },
    bottomRow: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 4,
    },
    priceWrap: {
        flex: 1,
    },
    oldPrice: {
        fontSize: 11,
        color: "#777",
        textDecorationLine: "line-through",
    },
    price: {
        fontSize: 18,
        color: "#121212",
        marginTop: 1,
        fontWeight: "700",
    },
    addCircleBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#0e0e0e",
        alignItems: "center",
        justifyContent: "center",
    },
    unavailableText: {
        marginTop: 5,
        width: "100%",
        color: "#777",
        fontSize: 12,
    },
    adminText: {
        marginTop: 5,
        width: "100%",
        color: "#666",
        fontSize: 12,
    },
});

export default ProductCard;
