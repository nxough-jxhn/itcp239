import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Image, TouchableOpacity, Animated, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import OrderCard from "../../Shared/OrderCard";
import AppPageHeader from "../../Shared/AppPageHeader";
import AuthGlobal from "../../Context/Store/AuthGlobal";
import { fetchOrderById, fetchOrders } from "../../Redux/Actions/orderActions";
import { addToCart } from "../../Redux/Actions/cartActions";
import Toast from "react-native-toast-message";
import baseURL from "../../assets/common/baseurl";
import { getJwtToken } from "../../assets/common/authToken";

const FALLBACK_IMAGE = "https://cdn.pixabay.com/photo/2012/04/01/17/29/box-23649_960_720.png";

const normalizeStatus = (value) => String(value || "").toLowerCase();

const getOrderItemProductId = (orderItem) => {
    if (!orderItem) return "";
    if (typeof orderItem.product === "object") {
        return String(orderItem.product?.id || orderItem.product?._id || "").trim();
    }
    return String(orderItem.product || "").trim();
};

const formatDateTime = (value) => {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
};

const mapEquals = (a, b) => {
    const aKeys = Object.keys(a || {});
    const bKeys = Object.keys(b || {});
    if (aKeys.length !== bKeys.length) return false;
    for (let i = 0; i < aKeys.length; i += 1) {
        const key = aKeys[i];
        if (b[key] !== a[key]) return false;
    }
    return true;
};

const OrderDetails = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const context = useContext(AuthGlobal);
    const isAdmin = context?.stateUser?.user?.isAdmin === true;

    const scrollRef = useRef(null);
    const itemLayoutYRef = useRef({});
    const focusFadeOpacity = useRef(new Animated.Value(0)).current;

    const [focusedItemKey, setFocusedItemKey] = useState("");
    const [availabilityLoading, setAvailabilityLoading] = useState(false);
    const [unavailableProductIds, setUnavailableProductIds] = useState({});
    const [productDescriptionById, setProductDescriptionById] = useState({});
    const [reviewByProductId, setReviewByProductId] = useState({});
    const [statusActionLoading, setStatusActionLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const orderId = route?.params?.orderId;
    const focusProductId = String(route?.params?.focusProductId || "").trim();

    const order = useSelector((state) => state.orders?.detailsById?.[String(orderId || "")] || null);
    const loading = useSelector((state) => state.orders?.loadingDetails === true);
    const error = useSelector((state) => state.orders?.error || "");

    useFocusEffect(
        useCallback(() => {
            if (!orderId) return () => {};
            dispatch(fetchOrderById(orderId));
            return () => {};
        }, [orderId, dispatch])
    );

    const orderItems = useMemo(() => {
        return Array.isArray(order?.orderItems) ? order.orderItems : [];
    }, [order?.orderItems]);

    const productIds = useMemo(() => {
        return [...new Set(orderItems.map(getOrderItemProductId).filter(Boolean))];
    }, [orderItems]);

    const productIdsKey = useMemo(() => productIds.join("|"), [productIds]);

    useEffect(() => {
        let mounted = true;

        const loadAvailability = async () => {
            if (!productIds.length) {
                if (mounted) {
                    setUnavailableProductIds((prev) => (Object.keys(prev).length ? {} : prev));
                    setAvailabilityLoading(false);
                }
                return;
            }

            setAvailabilityLoading(true);

            const nextMap = {};
            const nextDescriptions = {};
            const results = await Promise.allSettled(
                productIds.map((id) => axios.get(`${baseURL}products/${id}`, { timeout: 6000 }))
            );

            results.forEach((result, index) => {
                const id = productIds[index];
                if (result.status !== "fulfilled") {
                    nextMap[id] = true;
                    return;
                }

                const product = result.value?.data || {};
                const stock = Number(product?.countInStock);
                nextDescriptions[id] = String(product?.description || "").trim();
                if (!Number.isFinite(stock) || stock <= 0 || product?.isDeleted === true) {
                    nextMap[id] = true;
                }
            });

            if (mounted) {
                setUnavailableProductIds((prev) => (mapEquals(prev, nextMap) ? prev : nextMap));
                setProductDescriptionById(nextDescriptions);
                setAvailabilityLoading(false);
            }
        };

        loadAvailability().catch(() => {
            if (mounted) {
                setAvailabilityLoading(false);
            }
        });

        return () => {
            mounted = false;
        };
    }, [productIdsKey]);

    const focusedIndex = useMemo(() => {
        if (!focusProductId) return -1;
        return orderItems.findIndex((orderItem) => getOrderItemProductId(orderItem) === focusProductId);
    }, [orderItems, focusProductId]);

    useEffect(() => {
        if (focusedIndex < 0 || !orderItems[focusedIndex]) {
            setFocusedItemKey("");
            focusFadeOpacity.setValue(0);
            return;
        }

        const itemKey = `${getOrderItemProductId(orderItems[focusedIndex])}-${focusedIndex}`;
        setFocusedItemKey(itemKey);
        focusFadeOpacity.setValue(1);

        const tryScroll = () => {
            const y = itemLayoutYRef.current[itemKey];
            if (scrollRef.current && Number.isFinite(y)) {
                scrollRef.current.scrollTo({ y: Math.max(0, y - 10), animated: true });
            }
        };

        const scrollTimeout = setTimeout(tryScroll, 120);
        const fadeTimeout = setTimeout(() => {
            Animated.timing(focusFadeOpacity, {
                toValue: 0,
                duration: 900,
                useNativeDriver: true,
            }).start(({ finished }) => {
                if (finished) {
                    setFocusedItemKey((current) => (current === itemKey ? "" : current));
                }
            });
        }, 220);

        return () => {
            clearTimeout(scrollTimeout);
            clearTimeout(fadeTimeout);
            focusFadeOpacity.stopAnimation();
        };
    }, [focusedIndex, orderItems, focusFadeOpacity]);

    const unavailableByIndex = useMemo(() => {
        return orderItems.map((item) => {
            const productId = getOrderItemProductId(item);
            return !productId || unavailableProductIds[productId] === true;
        });
    }, [orderItems, unavailableProductIds]);

    const hasUnavailableProduct = unavailableByIndex.some(Boolean);
    const canReorder = !availabilityLoading && orderItems.length > 0 && !hasUnavailableProduct;

    const status = normalizeStatus(order?.status);
    const isDelivered = status === "delivered";

    const reviewEligibleItems = useMemo(() => {
        if (!isDelivered) return [];

        return orderItems
            .map((item, index) => {
                const productId = getOrderItemProductId(item);
                return {
                    key: `${productId || "missing"}-${index}`,
                    productId,
                    productName: String(item?.name || "Product"),
                    hasUserReview: item?.hasUserReview === true,
                    canLeaveReview: item?.canLeaveReview === true,
                };
            })
            .filter((item) => item.productId && (item.hasUserReview || item.canLeaveReview));
    }, [orderItems, isDelivered]);

    const reviewPreviewKey = useMemo(() => {
        return reviewEligibleItems
            .filter((item) => item.hasUserReview)
            .map((item) => item.productId)
            .join("|");
    }, [reviewEligibleItems]);

    useEffect(() => {
        let mounted = true;

        const loadReviewPreview = async () => {
            const reviewedItems = reviewEligibleItems.filter((item) => item.hasUserReview);

            if (!reviewedItems.length || !orderId) {
                if (mounted) {
                    setReviewByProductId((prev) => (Object.keys(prev).length ? {} : prev));
                }
                return;
            }

            const token = (await getJwtToken()) || "";
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const nextMap = {};
            const results = await Promise.allSettled(
                reviewedItems.map((item) =>
                    axios.get(`${baseURL}products/${item.productId}/reviews/me`, {
                        params: { orderId },
                        ...config,
                    })
                )
            );

            results.forEach((result, index) => {
                const productId = reviewedItems[index]?.productId;
                if (!productId) return;

                if (result.status === "fulfilled") {
                    const review = result.value?.data?.review || null;
                    if (review) {
                        nextMap[productId] = {
                            rating: Number(review?.rating || 0),
                            comment: String(review?.comment || "").trim(),
                        };
                    }
                }
            });

            if (mounted) {
                setReviewByProductId((prev) => (mapEquals(prev, nextMap) ? prev : nextMap));
            }
        };

        loadReviewPreview().catch(() => {
            if (mounted) {
                setReviewByProductId((prev) => prev);
            }
        });

        return () => {
            mounted = false;
        };
    }, [reviewPreviewKey, orderId]);

    const onReorder = () => {
        if (!canReorder) return;

        orderItems.forEach((orderItem) => {
            dispatch(
                addToCart({
                    ...orderItem,
                    id: orderItem?.product?.id || orderItem?.product?._id || orderItem?.product,
                    name: orderItem?.name,
                    image: orderItem?.image,
                    price: Number(orderItem?.price || 0),
                    quantity: Math.max(1, Number(orderItem?.quantity || 1)),
                })
            );
        });

        Toast.show({ topOffset: 60, type: "success", text1: "Items added back to cart" });
    };

    const onRefresh = useCallback(async () => {
        if (!orderId) return;
        setRefreshing(true);
        try {
            await dispatch(fetchOrderById(orderId));
        } finally {
            setRefreshing(false);
        }
    }, [dispatch, orderId]);

    const updateOrderStatus = async (nextStatus) => {
        if (!orderId || statusActionLoading) return;

        try {
            setStatusActionLoading(true);
            const token = (await getJwtToken()) || "";
            await axios.put(
                `${baseURL}orders/${orderId}`,
                { status: nextStatus },
                { headers: { Authorization: `Bearer ${token}` }, timeout: 8000 }
            );

            await Promise.all([dispatch(fetchOrderById(orderId)), dispatch(fetchOrders())]);
            Toast.show({ topOffset: 60, type: "success", text1: `Order marked as ${nextStatus}` });
        } catch (err) {
            Toast.show({
                topOffset: 60,
                type: "error",
                text1: err?.response?.data?.message || "Unable to update order status",
            });
        } finally {
            setStatusActionLoading(false);
        }
    };

    if (!orderId) {
        return (
            <View style={styles.container}>
                <AppPageHeader title="Order Details" />
                <View style={styles.center}>
                    <Text style={styles.errorText}>Missing order reference.</Text>
                </View>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={styles.container}>
                <AppPageHeader title="Order Details" />
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#111" />
                    <Text style={styles.infoText}>Loading order details...</Text>
                </View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <AppPageHeader title="Order Details" />
                <View style={styles.center}>
                    <Text style={styles.errorText}>Unable to load this order.</Text>
                </View>
            </View>
        );
    }

    if (!order) {
        return (
            <View style={styles.container}>
                <AppPageHeader title="Order Details" />
                <View style={styles.center}>
                    <Text style={styles.infoText}>Order not found.</Text>
                </View>
            </View>
        );
    }

    const orderDate = formatDateTime(order?.dateOrdered);
    const orderIdShort = String(order?.id || order?._id || "").slice(-8).toUpperCase();
    const paymentLabel = String(order?.paymentMethod || "Cash on Delivery").trim();

    const subtotalBase = Number(order?.subtotalBase || 0);
    const promoDiscountTotal = Number(order?.promoDiscountTotal || 0);
    const voucherDiscountTotal = Number(order?.voucherDiscountTotal || 0);
    const totalPrice = Number(order?.totalPrice || 0);

    const stepIndexByStatus = { pending: 1, shipped: 2, delivered: 3 };
    const activeStep = stepIndexByStatus[status] ?? 0;

    const steps = [
        { icon: "cube-outline" },
        { icon: "car-outline" },
        { icon: "people-outline" },
        { icon: "bag-check-outline" },
    ];

    if (isAdmin) {
        return (
            <View style={styles.container}>
                <AppPageHeader title="Order Details" />
                <OrderCard item={order} update={isAdmin} isAdmin={isAdmin} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <AppPageHeader title="Order Details" />
            <ScrollView
                ref={scrollRef}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing || loading} onRefresh={onRefresh} />}
            >
                {status === "cancelled" ? (
                    <View style={styles.cancelStatusWrap}>
                        <Ionicons name="close-circle" size={30} color="#c62828" />
                        <Text style={styles.cancelStatusText}>Cancelled</Text>
                    </View>
                ) : (
                    <View style={styles.stepRow}>
                        {steps.map((step, index) => {
                            const isActive = index <= activeStep;
                            const iconColor = isActive ? "#111" : "#bdbdbd";

                            return (
                                <View key={`step-${index}`} style={styles.stepItem}>
                                    <Ionicons name={step.icon} size={27} color={iconColor} />
                                    <View style={[styles.stepStatusDot, isActive && styles.stepStatusDotActive]}>
                                        {isActive ? <Ionicons name="checkmark" size={9} color="#fff" /> : null}
                                    </View>
                                    <Text style={[styles.stepText, isActive && styles.stepTextActive]}>
                                        {index === 0 ? "Confirmed" : index === 1 ? "Pending" : index === 2 ? "Shipped" : "Delivered"}
                                    </Text>
                                    {index < steps.length - 1 ? <View style={styles.stepLine} /> : null}
                                </View>
                            );
                        })}
                    </View>
                )}

                <View style={styles.metaCard}>
                    <Text style={styles.orderIdText}>#Order ID {orderIdShort}</Text>

                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, styles.infoLabelStrong]}>Order Date</Text>
                        <Text style={styles.infoValue}>{orderDate}</Text>
                    </View>

                    <Text style={styles.infoLabelStandalone}>Delivery Location</Text>
                    <View style={styles.infoRow}>
                        <View style={styles.infoLabelWithIcon}>
                            <Ionicons name="location-outline" size={19} color="#5f5f5f" />
                            <Text style={[styles.infoLabelInline, styles.infoLabelStrong]}>Delivery Address</Text>
                        </View>
                        <Text numberOfLines={2} style={styles.infoValueRight}>
                            {String(order?.shippingAddress1 || "").trim() || "-"}, {String(order?.city || "").trim() || "-"}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoLabelWithIcon}>
                            <Ionicons name="card-outline" size={19} color="#5f5f5f" />
                            <Text style={[styles.infoLabelInline, styles.infoLabelStrong]}>Payment Method</Text>
                        </View>
                        <Text style={styles.infoValue}>{paymentLabel}</Text>
                    </View>
                </View>

                {orderItems.map((orderItem, index) => {
                    const productId = getOrderItemProductId(orderItem);
                    const focused = focusedItemKey === `${productId}-${index}`;

                    return (
                        <View
                            key={`${orderItem?.id || orderItem?._id || index}`}
                            onLayout={(event) => {
                                itemLayoutYRef.current[`${productId}-${index}`] = Number(event?.nativeEvent?.layout?.y || 0);
                            }}
                            style={styles.itemRow}
                        >
                            {focused ? (
                                <Animated.View pointerEvents="none" style={[styles.focusOverlay, { opacity: focusFadeOpacity }]} />
                            ) : null}
                            <Image source={{ uri: orderItem?.image || FALLBACK_IMAGE }} style={styles.itemImage} />
                            <View style={styles.itemInfo}>
                                <Text numberOfLines={1} style={styles.itemName}>{orderItem?.name || "Product"}</Text>
                                <Text style={styles.itemMeta}>Qty: {Math.max(1, Number(orderItem?.quantity || 1))}</Text>
                                <Text numberOfLines={2} style={styles.itemDesc}>
                                    {String(
                                        orderItem?.description
                                        || orderItem?.product?.description
                                        || productDescriptionById[productId]
                                        || "No description available."
                                    )}
                                </Text>
                            </View>
                            <Text style={styles.itemPrice}>${Number(orderItem?.price || 0).toFixed(2)}</Text>
                        </View>
                    );
                })}

                {reviewEligibleItems.length > 0 ? (
                    <View style={styles.reviewSection}>
                        {reviewEligibleItems.map((item) => {
                            const preview = reviewByProductId[item.productId];
                            const sourceOrderItem = orderItems.find((orderItem) => getOrderItemProductId(orderItem) === item.productId) || {};
                            const ratingLabel = preview ? `${Number(preview.rating || 0).toFixed(1)}★` : "-";
                            return (
                                <View key={`review-${item.key}`} style={styles.reviewRow}>
                                    <View style={styles.reviewTopRow}>
                                        <Text numberOfLines={1} style={styles.reviewProductName}>{item.productName}</Text>
                                        <Text style={styles.reviewRating}>{ratingLabel}</Text>
                                    </View>

                                    <View style={styles.reviewBottomRow}>
                                        <Text numberOfLines={2} style={styles.reviewPreviewText}>
                                            {item.hasUserReview
                                                ? (preview?.comment || "No review text")
                                                : "You can leave a review for this product."}
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.reviewBtn}
                                            onPress={() => {
                                                if (item.hasUserReview) {
                                                    navigation.navigate("Home", {
                                                        screen: "Product Detail",
                                                        params: {
                                                            item: {
                                                                id: item.productId,
                                                                _id: item.productId,
                                                                name: sourceOrderItem?.name || item.productName,
                                                                image: sourceOrderItem?.image || FALLBACK_IMAGE,
                                                                description: sourceOrderItem?.description || productDescriptionById[item.productId] || "",
                                                                price: Number(sourceOrderItem?.price || 0),
                                                            },
                                                        },
                                                    });
                                                    return;
                                                }

                                                navigation.navigate("Home", {
                                                    screen: "Leave Review",
                                                    params: {
                                                        orderId: order?.id || order?._id,
                                                        productId: item.productId,
                                                        productName: item.productName,
                                                    },
                                                });
                                            }}
                                        >
                                            <Text style={styles.reviewBtnText}>{item.hasUserReview ? "View Review" : "Leave a Review"}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                ) : null}

                <View style={styles.priceSection}>
                    <View style={styles.priceRow}>
                        <Text style={styles.priceKey}>Subtotal</Text>
                        <Text style={styles.priceVal}>${subtotalBase.toFixed(2)}</Text>
                    </View>
                    <View style={styles.priceRow}>
                        <Text style={styles.priceKey}>Promo</Text>
                        <Text style={styles.priceVal}>- ${promoDiscountTotal.toFixed(2)}</Text>
                    </View>
                    <View style={styles.priceRow}>
                        <Text style={styles.priceKey}>Voucher</Text>
                        <Text style={styles.priceVal}>- ${voucherDiscountTotal.toFixed(2)}</Text>
                    </View>
                </View>

                <View style={styles.totalRow}>
                    <Text style={styles.totalKey}>Total Cost</Text>
                    <Text style={styles.totalVal}>${totalPrice.toFixed(2)}</Text>
                </View>

                {status === "pending" ? (
                    <TouchableOpacity
                        style={[styles.statusBtn, styles.statusBtnDanger, statusActionLoading && styles.statusBtnDisabled]}
                        onPress={() => updateOrderStatus("cancelled")}
                        disabled={statusActionLoading}
                    >
                        <Text style={styles.statusBtnText}>{statusActionLoading ? "Updating..." : "Cancel Order"}</Text>
                    </TouchableOpacity>
                ) : null}

                {status === "shipped" ? (
                    <View style={styles.statusBtnRow}>
                        <TouchableOpacity
                            style={[styles.statusBtn, styles.statusBtnDanger, styles.statusBtnHalf, statusActionLoading && styles.statusBtnDisabled]}
                            onPress={() => updateOrderStatus("cancelled")}
                            disabled={statusActionLoading}
                        >
                            <Text style={styles.statusBtnText}>Cancel Order</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.statusBtn, styles.statusBtnHalf, statusActionLoading && styles.statusBtnDisabled]}
                            onPress={() => updateOrderStatus("delivered")}
                            disabled={statusActionLoading}
                        >
                            <Text style={styles.statusBtnText}>{statusActionLoading ? "Updating..." : "Mark as Delivered"}</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                {status === "delivered" || status === "cancelled" ? (
                    <>
                        <TouchableOpacity
                            style={[styles.reorderBtn, !canReorder && styles.reorderBtnDisabled]}
                            onPress={onReorder}
                            disabled={!canReorder}
                        >
                            <Text style={[styles.reorderText, !canReorder && styles.reorderTextDisabled]}>
                                {availabilityLoading ? "Checking availability..." : "Reorder"}
                            </Text>
                        </TouchableOpacity>

                        {!canReorder && !availabilityLoading ? (
                            <Text style={styles.unavailableNote}>Product is currently unavailable.</Text>
                        ) : null}
                    </>
                ) : null}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    content: {
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 24,
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 22,
    },
    infoText: {
        marginTop: 10,
        fontSize: 14,
        color: "#444",
        textAlign: "center",
    },
    errorText: {
        fontSize: 14,
        color: "#b00020",
        textAlign: "center",
    },
    stepRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 14,
        marginTop: 2,
    },
    stepItem: {
        flex: 1,
        alignItems: "center",
        position: "relative",
    },
    stepStatusDot: {
        marginTop: 5,
        width: 13,
        height: 13,
        borderRadius: 6.5,
        borderWidth: 1,
        borderColor: "#cbcbcb",
        backgroundColor: "#f7f7f7",
        alignItems: "center",
        justifyContent: "center",
    },
    stepStatusDotActive: {
        borderColor: "#111",
        backgroundColor: "#111",
    },
    stepText: {
        marginTop: 4,
        fontSize: 11,
        color: "#8b8b8b",
        fontWeight: "600",
    },
    stepTextActive: {
        color: "#252525",
    },
    stepLine: {
        position: "absolute",
        right: -14,
        top: 11,
        width: 28,
        borderTopWidth: 1,
        borderTopColor: "#bdbdbd",
        borderStyle: "dashed",
    },
    cancelStatusWrap: {
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
        marginTop: 4,
    },
    cancelStatusText: {
        marginTop: 4,
        color: "#c62828",
        fontWeight: "700",
        fontSize: 12,
    },
    metaCard: {
        backgroundColor: "#fff",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#e8e8e8",
        paddingHorizontal: 14,
        paddingVertical: 14,
        marginBottom: 12,
    },
    orderIdText: {
        color: "#2d2d2d",
        fontSize: 17,
        fontWeight: "700",
        marginBottom: 14,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 11,
        gap: 10,
    },
    infoLabel: {
        color: "#6a6a6a",
        fontSize: 13,
        fontWeight: "500",
        flex: 1,
    },
    infoLabelStrong: {
        fontWeight: "700",
        color: "#2a2a2a",
    },
    infoValue: {
        color: "#1f1f1f",
        fontSize: 13,
        fontWeight: "400",
        flexShrink: 0,
    },
    infoLabelStandalone: {
        color: "#6a6a6a",
        fontSize: 13,
        fontWeight: "500",
        marginBottom: 9,
    },
    infoLabelWithIcon: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    infoLabelInline: {
        marginLeft: 8,
        color: "#1f1f1f",
        fontSize: 13,
        fontWeight: "700",
    },
    infoValueRight: {
        flex: 1,
        textAlign: "right",
        color: "#1f1f1f",
        fontSize: 13,
        fontWeight: "400",
    },
    itemRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: 10,
        marginBottom: 7,
        borderBottomWidth: 1,
        borderBottomColor: "#ececec",
        position: "relative",
        overflow: "hidden",
    },
    focusOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "#111",
        opacity: 0.06,
    },
    itemImage: {
        width: 68,
        height: 68,
        borderRadius: 10,
        backgroundColor: "#efefef",
    },
    itemInfo: {
        flex: 1,
        marginLeft: 12,
        paddingTop: 2,
    },
    itemName: {
        color: "#1a1a1a",
        fontSize: 15,
        fontWeight: "700",
        marginBottom: 6,
    },
    itemMeta: {
        color: "#6f6f6f",
        fontSize: 12,
        marginBottom: 6,
    },
    itemDesc: {
        color: "#7a7a7a",
        fontSize: 12,
        lineHeight: 16,
    },
    itemPrice: {
        color: "#111",
        fontSize: 15,
        fontWeight: "700",
        marginLeft: 8,
        marginTop: 2,
    },
    reviewSection: {
        marginTop: 4,
        marginBottom: 6,
    },
    reviewRow: {
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#ededed",
    },
    reviewTopRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    reviewProductName: {
        color: "#222",
        fontSize: 13,
        fontWeight: "700",
        flex: 1,
        marginRight: 8,
    },
    reviewRating: {
        color: "#111",
        fontSize: 12,
        fontWeight: "700",
    },
    reviewBottomRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 8,
    },
    reviewPreviewText: {
        color: "#6a6a6a",
        fontSize: 12,
        lineHeight: 16,
        flex: 1,
    },
    reviewBtn: {
        alignSelf: "flex-start",
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
        backgroundColor: "#111",
    },
    reviewBtnText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "700",
    },
    priceSection: {
        marginTop: 10,
        marginBottom: 4,
    },
    priceRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 7,
    },
    priceKey: {
        color: "#636363",
        fontSize: 13,
    },
    priceVal: {
        color: "#2b2b2b",
        fontSize: 13,
        fontWeight: "600",
    },
    totalRow: {
        marginTop: 4,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: "#dadada",
        borderStyle: "dashed",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    totalKey: {
        color: "#111",
        fontSize: 17,
        fontWeight: "700",
    },
    totalVal: {
        color: "#111",
        fontSize: 19,
        fontWeight: "800",
    },
    statusBtnRow: {
        marginTop: 14,
        flexDirection: "row",
        gap: 8,
    },
    statusBtn: {
        marginTop: 14,
        height: 46,
        borderRadius: 10,
        backgroundColor: "#0f0f0f",
        alignItems: "center",
        justifyContent: "center",
    },
    statusBtnHalf: {
        flex: 1,
        marginTop: 0,
    },
    statusBtnDanger: {
        backgroundColor: "#8f1f1f",
    },
    statusBtnDisabled: {
        opacity: 0.65,
    },
    statusBtnText: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "700",
    },
    reorderBtn: {
        marginTop: 14,
        height: 48,
        borderRadius: 10,
        backgroundColor: "#0f0f0f",
        alignItems: "center",
        justifyContent: "center",
    },
    reorderBtnDisabled: {
        backgroundColor: "#c9c9c9",
    },
    reorderText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "700",
    },
    reorderTextDisabled: {
        color: "#6b6b6b",
    },
    unavailableNote: {
        marginTop: 8,
        color: "#b00020",
        fontSize: 12,
        fontWeight: "700",
    },
});

export default OrderDetails;
