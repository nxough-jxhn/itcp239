import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { View, FlatList, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Image } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import AuthGlobal from "../../Context/Store/AuthGlobal";
import { fetchOrders } from "../../Redux/Actions/orderActions";
import AppPageHeader from "../../Shared/AppPageHeader";
import { Ionicons } from "@expo/vector-icons";
import baseURL from "../../assets/common/baseurl";

const STATUS = {
    pending: { label: "Preparing", color: "#9a9a9a", icon: "cube-outline" },
    shipped: { label: "Shipped on the way", color: "#4b8ee8", icon: "car-outline" },
    delivered: { label: "Delivered", color: "#36a359", icon: "checkmark-done-outline" },
    cancelled: { label: "Cancelled", color: "#e05a5a", icon: "close-circle-outline" },
};

const FALLBACK_IMAGE = "https://cdn.pixabay.com/photo/2012/04/01/17/29/box-23649_960_720.png";

const formatDate = (value) => {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const getOrderItemProductId = (orderItem) => {
    if (!orderItem) return "";
    if (typeof orderItem.product === "object") {
        return String(orderItem.product?.id || orderItem.product?._id || "").trim();
    }
    return String(orderItem.product || "").trim();
};

const MyOrders = () => {
    const dispatch = useDispatch();
    const orderList = useSelector((state) => state.orders?.list || []);
    const loading = useSelector((state) => state.orders?.loading === true);
    const error = useSelector((state) => state.orders?.error || "");
    const context = useContext(AuthGlobal);
    const navigation = useNavigation();
    const isAdmin = context?.stateUser?.user?.isAdmin === true;
    const [refreshing, setRefreshing] = useState(false);
    const [productDescriptionById, setProductDescriptionById] = useState({});
    const [statusFilter, setStatusFilter] = useState("pending");

    const filteredOrders = useMemo(() => {
        const normalizedFilter = String(statusFilter || "").toLowerCase();
        return (orderList || []).filter((order) => String(order?.status || "").toLowerCase() === normalizedFilter);
    }, [orderList, statusFilter]);

    const leadProductIdsKey = useMemo(() => {
        const ids = (orderList || [])
            .map((order) => {
                const leadItem = Array.isArray(order?.orderItems) ? order.orderItems[0] : null;
                return getOrderItemProductId(leadItem);
            })
            .filter(Boolean);
        return [...new Set(ids)].join("|");
    }, [orderList]);

    useEffect(() => {
        let mounted = true;

        const loadDescriptions = async () => {
            const ids = leadProductIdsKey ? leadProductIdsKey.split("|").filter(Boolean) : [];
            if (!ids.length) {
                if (mounted) setProductDescriptionById({});
                return;
            }

            const results = await Promise.allSettled(
                ids.map((id) => axios.get(`${baseURL}products/${id}`, { timeout: 5000 }))
            );

            const next = {};
            results.forEach((result, index) => {
                const id = ids[index];
                if (result.status === "fulfilled") {
                    next[id] = String(result.value?.data?.description || "").trim();
                }
            });

            if (mounted) setProductDescriptionById(next);
        };

        loadDescriptions().catch(() => {
            if (mounted) setProductDescriptionById((prev) => prev);
        });

        return () => {
            mounted = false;
        };
    }, [leadProductIdsKey]);

    useFocusEffect(
        useCallback(() => {
            if (context.stateUser.isAuthenticated === false || context.stateUser.isAuthenticated === null) {
                navigation.navigate("User", { screen: "Login" });
                return () => {};
            }

            dispatch(fetchOrders());
            return () => {};
        }, [context.stateUser.isAuthenticated, navigation, dispatch])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await dispatch(fetchOrders());
        } finally {
            setRefreshing(false);
        }
    }, [dispatch]);

    if (isAdmin) {
        return (
            <View style={styles.container}>
                <AppPageHeader />
                <View style={styles.center}>
                    <Text style={{ color: "#1a1a1a", fontSize: 16 }}>Customer-only page</Text>
                    <Text style={{ color: "#666", marginTop: 6 }}>Admins cannot access customer orders here.</Text>
                </View>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={styles.container}>
                <AppPageHeader />
                <View style={styles.center}>
                    <Text style={{ color: "#1a1a1a", fontSize: 16 }}>Loading orders...</Text>
                </View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <AppPageHeader />
                <ScrollView
                    contentContainerStyle={styles.center}
                    refreshControl={<RefreshControl refreshing={refreshing || loading} onRefresh={onRefresh} />}
                >
                    <Text style={{ color: "#b00020", fontSize: 15, textAlign: "center", paddingHorizontal: 20 }}>
                        Unable to load orders right now. Pull down to retry when backend is up.
                    </Text>
                </ScrollView>
            </View>
        );
    }

    if (!orderList.length) {
        return (
            <View style={styles.container}>
                <AppPageHeader />
                <ScrollView
                    contentContainerStyle={styles.center}
                    refreshControl={<RefreshControl refreshing={refreshing || loading} onRefresh={onRefresh} />}
                >
                    <Text style={{ color: "#1a1a1a", fontSize: 16 }}>No orders yet.</Text>
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <AppPageHeader />

            <View style={styles.filterWrap}>
                {[
                    { key: "pending", label: "Pending" },
                    { key: "shipped", label: "Shipped" },
                    { key: "delivered", label: "Delivered" },
                    { key: "cancelled", label: "Cancelled" },
                ].map((tab) => {
                    const active = statusFilter === tab.key;
                    return (
                        <TouchableOpacity key={tab.key} style={styles.filterTab} onPress={() => setStatusFilter(tab.key)}>
                            <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>{tab.label}</Text>
                            {active ? <View style={styles.filterTabUnderline} /> : null}
                        </TouchableOpacity>
                    );
                })}
            </View>

            <FlatList
                data={filteredOrders}
                renderItem={({ item }) => {
                    const key = String(item?.status || "").toLowerCase();
                    const statusMeta = STATUS[key] || { label: key || "Unknown", color: "#666", icon: "ellipse-outline" };
                    const orderDate = formatDate(item?.dateOrdered);
                    const realOrderId = String(item?.id || item?._id || "").trim().toUpperCase().slice(0, 5);
                    const orderItems = Array.isArray(item?.orderItems) ? item.orderItems : [];
                    const leadItem = orderItems[0] || {};
                    const leadImage = String(leadItem?.image || "").trim() || FALLBACK_IMAGE;
                    const leadProductId = getOrderItemProductId(leadItem);
                    const extraCount = Math.max(0, orderItems.length - 1);
                    const productNameBase = String(leadItem?.name || "Product Name").trim();
                    const productName = extraCount > 0 ? `${productNameBase} +${extraCount} more` : productNameBase;
                    const productDescription = String(
                        leadItem?.description
                        || leadItem?.product?.description
                        || productDescriptionById[leadProductId]
                        || "Product Description"
                    ).trim() || "Product Description";
                    const totalPrice = Number(item?.totalPrice || 0);
                    const openOrderDetails = (focusProductId = "") => {
                        navigation.navigate("User", {
                            screen: "Order Details",
                            params: {
                                orderId: item?.id || item?._id,
                                focusProductId,
                            },
                        });
                    };

                    return (
                        <TouchableOpacity
                            style={styles.orderCard}
                            onPress={() => openOrderDetails("")}
                            activeOpacity={0.9}
                        >
                            <View style={styles.orderTopRow}>
                                <View style={styles.statusWrap}>
                                    <Ionicons name="cube-outline" size={16} color={statusMeta.color} />
                                    <Text style={[styles.statusText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                                </View>
                                <Text style={styles.orderIdText}>#{realOrderId} {'>'}</Text>
                            </View>

                            <View style={styles.productRow}>
                                <TouchableOpacity onPress={() => openOrderDetails(leadProductId)} activeOpacity={0.85}>
                                    <Image source={{ uri: leadImage }} style={styles.productImage} />
                                </TouchableOpacity>
                                <View style={styles.productInfo}>
                                    <Text numberOfLines={1} style={styles.productName}>{productName}</Text>
                                    <Text numberOfLines={2} style={styles.productDescription}>{productDescription}</Text>

                                    <View style={styles.metaRow}>
                                        <View style={styles.metaBlock}>
                                            <Text style={styles.metaLabel}>Order Placed</Text>
                                            <Text numberOfLines={1} style={styles.metaValue}>{orderDate}</Text>
                                        </View>
                                        <View style={styles.metaBlockRight}>
                                            <Text style={styles.metaLabel}>Total Price</Text>
                                            <Text numberOfLines={1} style={styles.metaValue}>$ {totalPrice.toFixed(2)}</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                }}
                keyExtractor={(item) => String(item.id || item._id)}
                refreshControl={<RefreshControl refreshing={refreshing || loading} onRefresh={onRefresh} />}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f7f7f7" },
    listContent: {
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 18,
    },
    filterWrap: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#e7e7e7",
        backgroundColor: "#f7f7f7",
        paddingHorizontal: 8,
    },
    filterTab: {
        flex: 1,
        alignItems: "center",
        paddingTop: 10,
        paddingBottom: 10,
    },
    filterTabText: {
        color: "#9a9a9a",
        fontSize: 14,
        fontWeight: "700",
    },
    filterTabTextActive: {
        color: "#151515",
    },
    filterTabUnderline: {
        marginTop: 8,
        width: "78%",
        height: 3,
        borderRadius: 2,
        backgroundColor: "#111",
    },
    orderCard: {
        backgroundColor: "#f3f3f3",
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#dedede",
        paddingHorizontal: 14,
        paddingVertical: 14,
        marginBottom: 14,
        shadowColor: "#000",
        shadowOpacity: 0.07,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    orderTopRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    statusWrap: {
        flexDirection: "row",
        alignItems: "center",
    },
    statusText: {
        marginLeft: 6,
        fontWeight: "700",
        fontSize: 14,
        textTransform: "capitalize",
    },
    orderIdText: {
        color: "#111",
        fontSize: 14,
        fontWeight: "800",
    },
    productRow: {
        marginTop: 12,
        flexDirection: "row",
        alignItems: "flex-start",
    },
    productImage: {
        width: 108,
        height: 108,
        borderRadius: 12,
        backgroundColor: "#e7e7e7",
    },
    productInfo: {
        flex: 1,
        marginLeft: 12,
        paddingTop: 2,
        minHeight: 108,
        justifyContent: "space-between",
    },
    productName: {
        color: "#1f1f1f",
        fontSize: 15,
        fontWeight: "700",
        marginBottom: 2,
    },
    productDescription: {
        color: "#303030",
        fontSize: 12,
        lineHeight: 16,
    },
    metaRow: {
        marginTop: 10,
        flexDirection: "row",
        justifyContent: "space-between",
    },
    metaBlock: {
        flex: 1,
        paddingRight: 8,
    },
    metaBlockRight: {
        flex: 1,
        alignItems: "flex-start",
    },
    metaLabel: {
        color: "#444",
        fontWeight: "500",
        fontSize: 12,
    },
    metaValue: {
        marginTop: 4,
        color: "#222",
        fontWeight: "700",
        fontSize: 12,
    },
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f5f5f5" },
});

export default MyOrders;
