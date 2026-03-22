import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Text,
    View,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    RefreshControl,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { Surface, Avatar, Button } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { SwipeListView } from "react-native-swipe-list-view";
import { removeFromCart, clearCart, setCartItems } from "../../Redux/Actions/cartActions";
import { getStoredCartItems } from "../../assets/common/cartStorage";
import AppPageHeader from "../../Shared/AppPageHeader";
import Toast from "react-native-toast-message";

const { height } = Dimensions.get("window");
const FALLBACK = "https://cdn.pixabay.com/photo/2012/04/01/17/29/box-23649_960_720.png";
const SHIPPING_FEE = 0;

const Cart = () => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const cartItems = useSelector((state) => state.cartItems || []);
    const [refreshing, setRefreshing] = useState(false);
    const autoDeletedRef = useRef({});

    useEffect(() => {
        autoDeletedRef.current = {};
    }, [cartItems]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        const stored = await getStoredCartItems();
        dispatch(setCartItems(stored));
        setRefreshing(false);
    }, [dispatch]);

    const getItemFinalUnitPrice = (item) => {
        const discounted = Number(item?.discountedPrice);
        if (Number.isFinite(discounted) && discounted > 0) return discounted;
        return Number(item?.price || 0);
    };

    const getItemOriginalUnitPrice = (item) => Number(item?.price || 0);

    const getItemId = (item) => String(item?.id || item?._id || item?.product || "").trim();

    const removeItem = (item) => {
        dispatch(removeFromCart(item));
    };

    const updateQuantity = (item, delta) => {
        const id = getItemId(item);
        if (!id) return;

        const updated = cartItems
            .map((row) => {
                if (getItemId(row) !== id) return row;
                const current = Math.max(1, Number(row?.quantity || 1));
                const rawStock = Number(row?.countInStock);
                const hasStockLimit = Number.isFinite(rawStock) && rawStock >= 0;
                const maxStock = hasStockLimit ? Math.floor(rawStock) : null;
                const requestedQuantity = current + delta;

                if (delta > 0 && hasStockLimit && maxStock <= 0) {
                    Toast.show({
                        topOffset: 60,
                        type: "error",
                        text1: "This item is out of stock",
                    });
                    return row;
                }

                if (delta > 0 && hasStockLimit && requestedQuantity > maxStock) {
                    Toast.show({
                        topOffset: 60,
                        type: "error",
                        text1: `Only ${maxStock} item(s) in stock`,
                    });
                    return row;
                }

                const nextQuantity = requestedQuantity;
                return { ...row, quantity: nextQuantity };
            })
            .filter((row) => Number(row?.quantity || 1) > 0);

        dispatch(setCartItems(updated));
    };

    const originalSubtotal = useMemo(() => {
        return cartItems.reduce((sum, item) => {
            const quantity = Math.max(1, Number(item?.quantity || 1));
            return sum + (getItemOriginalUnitPrice(item) * quantity);
        }, 0);
    }, [cartItems]);

    const promoAppliedSubtotal = useMemo(() => {
        return cartItems.reduce((sum, item) => {
            const quantity = Math.max(1, Number(item?.quantity || 1));
            return sum + (getItemFinalUnitPrice(item) * quantity);
        }, 0);
    }, [cartItems]);

    const promoDiscount = Math.max(0, originalSubtotal - promoAppliedSubtotal);

    const shipping = SHIPPING_FEE;
    const grandTotal = Math.max(0, promoAppliedSubtotal + shipping);
    const totalItems = useMemo(
        () => cartItems.reduce((sum, item) => sum + Math.max(1, Number(item?.quantity || 1)), 0),
        [cartItems]
    );

    const renderItem = ({ item }) => {
        const finalUnitPrice = getItemFinalUnitPrice(item);
        const originalUnitPrice = getItemOriginalUnitPrice(item);
        const quantity = Math.max(1, Number(item?.quantity || 1));
        const lineTotal = finalUnitPrice * quantity;
        const isOnSale = finalUnitPrice < originalUnitPrice;

        return (
            <View style={styles.rowContainer}>
                <Surface style={styles.itemCard}>
                    <Avatar.Image size={54} source={{ uri: item?.image || FALLBACK }} />
                    <View style={styles.itemBody}>
                        <Text numberOfLines={1} style={styles.itemName}>{String(item?.name || "Product")}</Text>
                        <View style={styles.priceMetaRow}>
                            {isOnSale ? <Text style={styles.saleBadge}>SALE</Text> : null}
                            {isOnSale ? (
                                <Text style={styles.originalMeta}>$ {originalUnitPrice.toFixed(2)}</Text>
                            ) : null}
                            <Text style={styles.itemMeta}>$ {finalUnitPrice.toFixed(2)} each</Text>
                        </View>
                        <View style={styles.itemBottomRow}>
                            <View style={styles.qtyRow}>
                                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item, -1)}>
                                    <Text style={styles.qtyBtnText}>-</Text>
                                </TouchableOpacity>
                                <Text style={styles.qtyText}>{quantity}</Text>
                                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item, 1)}>
                                    <Text style={styles.qtyBtnText}>+</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.itemTotal}>$ {lineTotal.toFixed(2)}</Text>
                        </View>
                    </View>
                </Surface>
            </View>
        );
    };

    const renderHiddenItem = ({ item }) => (
        <View style={styles.rowContainer}>
            <View style={styles.hiddenRow}>
                <TouchableOpacity style={styles.deleteSwipeBtn} onPress={() => removeItem(item)}>
                    <Ionicons name="trash" size={28} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );

    const handleSwipeValueChange = ({ key, value }) => {
        if (value > -168 || autoDeletedRef.current[key]) return;
        const matched = cartItems.find((item, index) => String(getItemId(item) || index) === key);
        if (!matched) return;

        autoDeletedRef.current[key] = true;
        removeItem(matched);
    };

    return (
        <View style={styles.page}>
            <AppPageHeader />

            <View style={styles.titleRow}>
                <Text style={styles.pageTitle}>My Cart</Text>
                {cartItems.length > 0 ? (
                    <TouchableOpacity style={styles.clearPill} onPress={() => dispatch(clearCart())}>
                        <Text style={styles.clearPillText}>Clear All</Text>
                    </TouchableOpacity>
                ) : null}
            </View>

            {cartItems.length === 0 ? (
                <View style={styles.emptyWrap}>
                    <Ionicons name="bag-handle-outline" size={46} color="#a0a0a0" />
                    <Text style={styles.emptyTitle}>Your cart is empty</Text>
                    <Text style={styles.emptySub}>Add products from the catalog to start checkout.</Text>
                </View>
            ) : (
                <SwipeListView
                    data={cartItems}
                    renderItem={renderItem}
                    renderHiddenItem={renderHiddenItem}
                    keyExtractor={(item, index) => String(getItemId(item) || index)}
                    rightOpenValue={-172}
                    disableRightSwipe
                    onSwipeValueChange={handleSwipeValueChange}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    contentContainerStyle={styles.listContent}
                />
            )}

            <View style={styles.bottomContainer}>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal (Original)</Text>
                    <Text style={styles.summaryValue}>$ {originalSubtotal.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Promo Discount</Text>
                    <Text style={styles.promoDiscountValue}>- $ {promoDiscount.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Cart Total (After Promo)</Text>
                    <Text style={styles.summaryValue}>$ {promoAppliedSubtotal.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Shipping</Text>
                    <Text style={styles.summaryValue}>$ {shipping.toFixed(2)}</Text>
                </View>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>$ {grandTotal.toFixed(2)}</Text>
                </View>

                <Button
                    mode="contained"
                    style={styles.checkoutBtn}
                    labelStyle={styles.checkoutBtnLabel}
                    onPress={() => navigation.navigate("Checkout")}
                    disabled={cartItems.length === 0}
                >
                    Checkout ({totalItems})
                </Button>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: "#f4f4f4",
    },
    titleRow: {
        paddingHorizontal: 14,
        paddingTop: 8,
        paddingBottom: 4,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    pageTitle: {
        fontSize: 30,
        fontWeight: "800",
        color: "#101010",
    },
    clearPill: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#dbdbdb",
        backgroundColor: "#efefef",
        paddingVertical: 5,
        paddingHorizontal: 12,
    },
    clearPillText: {
        color: "#555",
        fontSize: 12,
        fontWeight: "700",
    },
    listContent: {
        paddingHorizontal: 10,
        paddingTop: 4,
        paddingBottom: 170,
    },
    rowContainer: {
        height: 108,
        marginVertical: 5,
    },
    hiddenRow: {
        flex: 1,
        alignItems: "flex-end",
        justifyContent: "center",
        paddingRight: 1,
    },
    deleteSwipeBtn: {
        width: 146,
        height: "100%",
        borderRadius: 16,
        backgroundColor: "#0b0b0b",
        alignItems: "flex-end",
        justifyContent: "center",
        paddingRight: 22,
    },
    itemCard: {
        flex: 1,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#ececec",
        backgroundColor: "#fff",
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
    },
    itemBody: {
        flex: 1,
        marginLeft: 10,
    },
    itemName: {
        fontSize: 15,
        fontWeight: "700",
        color: "#111",
    },
    itemMeta: {
        color: "#7d7d7d",
        fontSize: 12,
        fontWeight: "600",
    },
    priceMetaRow: {
        marginTop: 4,
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
    },
    saleBadge: {
        marginRight: 6,
        backgroundColor: "#e8f8ea",
        color: "#1e7a35",
        fontSize: 10,
        fontWeight: "800",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        overflow: "hidden",
    },
    originalMeta: {
        marginRight: 6,
        color: "#9a9a9a",
        fontSize: 12,
        textDecorationLine: "line-through",
    },
    itemBottomRow: {
        marginTop: 10,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    qtyRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    qtyBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#d0d0d0",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fafafa",
    },
    qtyBtnText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#202020",
    },
    qtyText: {
        minWidth: 26,
        textAlign: "center",
        fontSize: 14,
        fontWeight: "700",
        color: "#111",
        marginHorizontal: 8,
    },
    itemTotal: {
        fontSize: 15,
        fontWeight: "800",
        color: "#111",
    },
    emptyWrap: {
        minHeight: height - 300,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
    },
    emptyTitle: {
        marginTop: 8,
        fontSize: 18,
        fontWeight: "700",
        color: "#222",
    },
    emptySub: {
        marginTop: 4,
        textAlign: "center",
        color: "#777",
    },
    bottomContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#ececec",
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 14,
    },
    summaryRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    summaryLabel: {
        color: "#888",
        fontSize: 13,
    },
    summaryValue: {
        color: "#444",
        fontWeight: "700",
        fontSize: 13,
    },
    promoDiscountValue: {
        color: "#1e7a35",
        fontWeight: "800",
        fontSize: 13,
    },
    totalRow: {
        marginTop: 2,
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    totalLabel: {
        fontSize: 15,
        color: "#101010",
        fontWeight: "700",
    },
    totalValue: {
        fontSize: 21,
        color: "#101010",
        fontWeight: "800",
    },
    checkoutBtn: {
        borderRadius: 14,
        backgroundColor: "#0b0b0b",
        height: 48,
        justifyContent: "center",
    },
    checkoutBtnLabel: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "700",
    },
});

export default Cart;
