import React, { useCallback, useMemo, useState } from "react";
import { View, FlatList, Text, StyleSheet, TouchableOpacity, RefreshControl, ScrollView } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { fetchOrders } from "../../Redux/Actions/orderActions";
import AppPageHeader from "../../Shared/AppPageHeader";
import { Ionicons } from "@expo/vector-icons";

const STATUS = {
    pending: { label: "Pending", color: "#6a6a6a" },
    shipped: { label: "Shipped", color: "#2563eb" },
    delivered: { label: "Delivered", color: "#15803d" },
    cancelled: { label: "Cancelled", color: "#b91c1c" },
};

const COL_WIDTHS = {
    orderId: 98,
    customer: 140,
    status: 110,
    placed: 108,
    items: 72,
    total: 96,
    actions: 100,
};
const TABLE_MIN_WIDTH =
    COL_WIDTHS.orderId
    + COL_WIDTHS.customer
    + COL_WIDTHS.status
    + COL_WIDTHS.placed
    + COL_WIDTHS.items
    + COL_WIDTHS.total
    + COL_WIDTHS.actions;

const formatDate = (value) => {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const getUserKey = (order) => String(order?.user?.id || order?.user?._id || order?.user || "");

const Orders = () => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const orderList = useSelector((state) => state.orders?.list || []);
    const loading = useSelector((state) => state.orders?.loading === true);
    const [refreshing, setRefreshing] = useState(false);
    const [statusFilter, setStatusFilter] = useState("pending");
    const [selectedUserId, setSelectedUserId] = useState("all");

    useFocusEffect(
        useCallback(() => {
            dispatch(fetchOrders());
            return () => {};
        }, [dispatch])
    );

    const users = useMemo(() => {
        const map = new Map();
        (orderList || []).forEach((order) => {
            const id = getUserKey(order);
            if (!id) return;
            const name = String(order?.user?.name || "Customer").trim() || "Customer";
            if (!map.has(id)) {
                map.set(id, { id, name });
            }
        });
        return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
    }, [orderList]);

    const filteredOrders = useMemo(() => {
        const statusNeedle = String(statusFilter || "").toLowerCase();
        return (orderList || []).filter((order) => {
            const statusMatch = String(order?.status || "").toLowerCase() === statusNeedle;
            if (!statusMatch) return false;
            if (selectedUserId === "all") return true;
            return getUserKey(order) === selectedUserId;
        });
    }, [orderList, statusFilter, selectedUserId]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await dispatch(fetchOrders());
        } finally {
            setRefreshing(false);
        }
    }, [dispatch]);

    return (
        <View style={styles.container}>
            <AppPageHeader title="Orders" />

            <View style={styles.statusFilterRow}>
                {[
                    { key: "pending", label: "Pending" },
                    { key: "shipped", label: "Shipped" },
                    { key: "delivered", label: "Delivered" },
                    { key: "cancelled", label: "Cancelled" },
                ].map((tab) => {
                    const active = statusFilter === tab.key;
                    return (
                        <TouchableOpacity key={tab.key} style={styles.statusFilterTab} onPress={() => setStatusFilter(tab.key)}>
                            <Text style={[styles.statusFilterText, active && styles.statusFilterTextActive]}>{tab.label}</Text>
                            {active ? <View style={styles.statusFilterUnderline} /> : null}
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={styles.userFilterWrap}>
                <Text style={styles.userFilterLabel}>Filter by User</Text>
                <FlatList
                    data={[{ id: "all", name: "All Users" }, ...users]}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.userFilterList}
                    renderItem={({ item }) => {
                        const active = selectedUserId === item.id;
                        return (
                            <TouchableOpacity style={[styles.userChip, active && styles.userChipActive]} onPress={() => setSelectedUserId(item.id)}>
                                <Text style={[styles.userChipText, active && styles.userChipTextActive]}>{item.name}</Text>
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableOuter}>
                <View style={[styles.tableWrap, { minWidth: TABLE_MIN_WIDTH }]}>
                    <View style={styles.tableHeaderRow}>
                        <Text style={[styles.headerCell, { width: COL_WIDTHS.orderId }]}>Order ID</Text>
                        <Text style={[styles.headerCell, { width: COL_WIDTHS.customer }]}>User</Text>
                        <Text style={[styles.headerCell, { width: COL_WIDTHS.status }]}>Status</Text>
                        <Text style={[styles.headerCell, { width: COL_WIDTHS.placed }]}>Placed</Text>
                        <Text style={[styles.headerCell, { width: COL_WIDTHS.items }]}>Items</Text>
                        <Text style={[styles.headerCell, { width: COL_WIDTHS.total }]}>Total</Text>
                        <Text style={[styles.headerCell, { width: COL_WIDTHS.actions }]}>Actions</Text>
                    </View>

                    <FlatList
                        data={filteredOrders}
                        keyExtractor={(item) => String(item.id || item._id)}
                        refreshControl={<RefreshControl refreshing={refreshing || loading} onRefresh={onRefresh} />}
                        contentContainerStyle={styles.tableBody}
                        ListEmptyComponent={!loading ? <Text style={styles.emptyText}>No orders for selected filters.</Text> : null}
                        renderItem={({ item, index }) => {
                            const statusKey = String(item?.status || "").toLowerCase();
                            const statusMeta = STATUS[statusKey] || { label: "Unknown", color: "#555" };
                            const itemCount = Array.isArray(item?.orderItems) ? item.orderItems.length : 0;
                            const totalPrice = Number(item?.totalPrice || 0);
                            const customerName = String(item?.user?.name || "Customer");
                            const orderIdShort = String(item?.id || item?._id || "").slice(-8).toUpperCase();

                            return (
                                <View style={[styles.tableRow, { backgroundColor: index % 2 === 0 ? "#fff" : "#f2f2f2" }]}>
                                    <Text style={[styles.rowCellText, styles.orderIdText, { width: COL_WIDTHS.orderId }]}>#{orderIdShort}</Text>
                                    <Text numberOfLines={1} style={[styles.rowCellText, { width: COL_WIDTHS.customer }]}>{customerName}</Text>
                                    <View style={[styles.statusCell, { width: COL_WIDTHS.status }]}> 
                                        <View style={[styles.statusBadge, { borderColor: statusMeta.color, backgroundColor: `${statusMeta.color}15` }]}>
                                            <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.rowCellText, { width: COL_WIDTHS.placed }]}>{formatDate(item?.dateOrdered)}</Text>
                                    <Text style={[styles.rowCellText, { width: COL_WIDTHS.items }]}>{Math.max(1, itemCount)}</Text>
                                    <Text style={[styles.rowCellText, styles.totalText, { width: COL_WIDTHS.total }]}>$ {totalPrice.toFixed(2)}</Text>
                                    <View style={[styles.actionCell, { width: COL_WIDTHS.actions }]}>
                                        <TouchableOpacity
                                            style={styles.iconBtn}
                                            onPress={() => navigation.navigate("Order Details", { orderId: item?.id || item?._id })}
                                        >
                                            <Ionicons name="eye-outline" size={16} color="#222" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        }}
                    />
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    statusFilterRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#e5e5e5",
        backgroundColor: "#f5f5f5",
        paddingHorizontal: 8,
    },
    statusFilterTab: {
        flex: 1,
        alignItems: "center",
        paddingTop: 9,
        paddingBottom: 8,
    },
    statusFilterText: {
        color: "#8c8c8c",
        fontSize: 12,
        fontWeight: "700",
    },
    statusFilterTextActive: {
        color: "#121212",
    },
    statusFilterUnderline: {
        marginTop: 7,
        width: "74%",
        height: 3,
        borderRadius: 3,
        backgroundColor: "#111",
    },
    userFilterWrap: {
        paddingTop: 8,
        paddingHorizontal: 12,
    },
    userFilterLabel: {
        color: "#343434",
        fontSize: 12,
        fontWeight: "700",
        marginBottom: 7,
    },
    userFilterList: {
        paddingBottom: 2,
    },
    userChip: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#d0d0d0",
        backgroundColor: "#f2f2f2",
        paddingVertical: 6,
        paddingHorizontal: 10,
        marginRight: 8,
    },
    userChipActive: {
        backgroundColor: "#111",
        borderColor: "#111",
    },
    userChipText: {
        color: "#313131",
        fontSize: 12,
        fontWeight: "600",
    },
    userChipTextActive: {
        color: "#fff",
    },
    tableOuter: {
        marginTop: 10,
        marginHorizontal: 12,
    },
    tableWrap: {
        flex: 1,
    },
    tableHeaderRow: {
        flexDirection: "row",
        borderWidth: 1,
        borderColor: "#dedede",
        backgroundColor: "#efefef",
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        paddingVertical: 8,
    },
    headerCell: {
        color: "#252525",
        fontSize: 12,
        fontWeight: "700",
        paddingHorizontal: 8,
    },
    tableBody: {
        borderWidth: 1,
        borderTopWidth: 0,
        borderColor: "#dedede",
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
        overflow: "hidden",
        paddingBottom: 16,
    },
    tableRow: {
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#e9e9e9",
        minHeight: 62,
        paddingVertical: 6,
    },
    rowCellText: {
        color: "#1f1f1f",
        fontSize: 12,
        paddingHorizontal: 8,
    },
    orderIdText: {
        fontWeight: "800",
    },
    statusCell: {
        paddingHorizontal: 8,
        justifyContent: "center",
    },
    statusBadge: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 3,
        alignSelf: "flex-start",
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: "700",
        textTransform: "capitalize",
    },
    totalText: {
        fontWeight: "800",
    },
    actionCell: {
        paddingHorizontal: 8,
        alignItems: "center",
    },
    iconBtn: {
        width: 34,
        height: 34,
        borderRadius: 8,
        backgroundColor: "#f0f0f0",
        borderWidth: 1,
        borderColor: "#d8d8d8",
        alignItems: "center",
        justifyContent: "center",
    },
    emptyText: {
        textAlign: "center",
        color: "#666",
        fontSize: 13,
        paddingVertical: 20,
    },
});

export default Orders;
