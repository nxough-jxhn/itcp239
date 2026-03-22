import React, { useCallback, useState } from "react";
import { View, FlatList, Text, StyleSheet, RefreshControl, ScrollView, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import { getJwtToken } from "../../assets/common/authToken";
import AppPageHeader from "../../Shared/AppPageHeader";

const FALLBACK_IMAGE = "https://cdn.pixabay.com/photo/2012/04/01/17/29/box-23649_960_720.png";
const COL_WIDTHS = {
    image: 86,
    product: 170,
    type: 96,
    stock: 82,
    threshold: 92,
    status: 98,
    actions: 96,
};
const TABLE_MIN_WIDTH =
    COL_WIDTHS.image + COL_WIDTHS.product + COL_WIDTHS.type + COL_WIDTHS.stock + COL_WIDTHS.threshold + COL_WIDTHS.status + COL_WIDTHS.actions;

const StockAlerts = () => {
    const navigation = useNavigation();
    const [alerts, setAlerts] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [statusFilter, setStatusFilter] = useState("all");

    const loadAlerts = () => {
        return getJwtToken()
            .then((res) =>
                axios.get(`${baseURL}stock-alerts`, {
                    headers: { Authorization: `Bearer ${res || ""}` },
                })
            )
            .then((res) => setAlerts(res.data || []))
            .catch(() => setAlerts([]));
    };

    useFocusEffect(
        useCallback(() => {
            let isMounted = true;
            loadAlerts().then(() => {
                if (!isMounted) return;
            });
            return () => {
                isMounted = false;
                setAlerts([]);
            };
        }, [])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadAlerts().finally(() => setRefreshing(false));
    }, []);

    const filteredAlerts = (alerts || []).filter((item) => {
        if (statusFilter === "all") return true;
        if (statusFilter === "active") return item?.resolved !== true;
        if (statusFilter === "resolved") return item?.resolved === true;
        return true;
    });

    return (
        <View style={styles.container}>
            <AppPageHeader title="Stock Alerts" />

            <View style={styles.filterRow}>
                {[{ key: "all", label: "All" }, { key: "active", label: "Active" }, { key: "resolved", label: "Resolved" }].map((tab) => {
                    const active = statusFilter === tab.key;
                    return (
                        <TouchableOpacity key={tab.key} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => setStatusFilter(tab.key)}>
                            <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{tab.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {filteredAlerts.length === 0 ? (
                <View style={styles.center}>
                    <Text style={styles.emptyTitle}>No stock alerts.</Text>
                    <Text style={styles.emptySub}>All products are currently above threshold.</Text>
                </View>
            ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableOuter}>
                    <View style={[styles.tableWrap, { minWidth: TABLE_MIN_WIDTH }]}> 
                        <View style={styles.tableHeaderRow}>
                            <Text style={[styles.headerCell, { width: COL_WIDTHS.image }]}>Image</Text>
                            <Text style={[styles.headerCell, { width: COL_WIDTHS.product }]}>Product</Text>
                            <Text style={[styles.headerCell, { width: COL_WIDTHS.type }]}>Type</Text>
                            <Text style={[styles.headerCell, { width: COL_WIDTHS.stock }]}>Stock</Text>
                            <Text style={[styles.headerCell, { width: COL_WIDTHS.threshold }]}>Threshold</Text>
                            <Text style={[styles.headerCell, { width: COL_WIDTHS.status }]}>Status</Text>
                            <Text style={[styles.headerCell, { width: COL_WIDTHS.actions }]}>Actions</Text>
                        </View>

                        <FlatList
                            data={filteredAlerts}
                            keyExtractor={(item) => String(item.id || item._id)}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                            contentContainerStyle={styles.tableBody}
                            renderItem={({ item, index }) => {
                                const statusLabel = item?.resolved ? "Resolved" : "Active";
                                const statusColor = item?.resolved ? "#4e4e4e" : "#7f5100";
                                const statusBg = item?.resolved ? "#ececec" : "#fff4de";
                                const statusBorder = item?.resolved ? "#cecece" : "#e5c272";
                                return (
                                    <View style={[styles.tableRow, { backgroundColor: index % 2 === 0 ? "#fff" : "#f2f2f2" }]}>
                                        <View style={[styles.rowCell, { width: COL_WIDTHS.image }]}>
                                            <Image
                                                source={{ uri: String(item?.product?.image || "").trim() || FALLBACK_IMAGE }}
                                                style={styles.productImage}
                                                resizeMode="cover"
                                            />
                                        </View>
                                        <Text numberOfLines={2} style={[styles.rowCellText, { width: COL_WIDTHS.product }]}>
                                            {String(item?.product?.name || "Unknown product")}
                                        </Text>
                                        <Text numberOfLines={1} style={[styles.rowCellText, { width: COL_WIDTHS.type }]}>{String(item?.type || "-")}</Text>
                                        <Text style={[styles.rowCellText, { width: COL_WIDTHS.stock }]}>{Number(item?.countInStock || 0)}</Text>
                                        <Text style={[styles.rowCellText, { width: COL_WIDTHS.threshold }]}>{Number(item?.threshold || 0)}</Text>
                                        <View style={[styles.rowCell, { width: COL_WIDTHS.status }]}> 
                                            <View style={[styles.statusBadge, { backgroundColor: statusBg, borderColor: statusBorder }]}>
                                                <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
                                            </View>
                                        </View>
                                        <View style={[styles.rowCell, { width: COL_WIDTHS.actions, flexDirection: "row", justifyContent: "center" }]}>
                                            <TouchableOpacity
                                                style={styles.iconBtn}
                                                onPress={() => {
                                                    const product = item?.product || null;
                                                    if (!product) return;
                                                    const categoryValue = product?.category;
                                                    const category = categoryValue && typeof categoryValue === "object"
                                                        ? categoryValue
                                                        : (categoryValue ? { _id: String(categoryValue), id: String(categoryValue) } : null);
                                                    const prefilled = { ...product, category };
                                                    const productId = prefilled?.id || prefilled?._id;
                                                    if (!productId) return;
                                                    prefilled.id = prefilled.id || String(productId);
                                                    prefilled._id = prefilled._id || String(productId);
                                                    navigation.navigate("ProductForm", { item: prefilled });
                                                }}
                                            >
                                                <Ionicons name="create-outline" size={16} color="#222" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            }}
                        />
                    </View>
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    filterRow: {
        paddingHorizontal: 12,
        paddingTop: 10,
        flexDirection: "row",
    },
    filterChip: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#d0d0d0",
        backgroundColor: "#f2f2f2",
        paddingVertical: 6,
        paddingHorizontal: 10,
        marginRight: 8,
    },
    filterChipActive: {
        backgroundColor: "#111",
        borderColor: "#111",
    },
    filterChipText: {
        color: "#313131",
        fontSize: 12,
        fontWeight: "600",
    },
    filterChipTextActive: {
        color: "#fff",
    },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    emptyTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#222",
    },
    emptySub: {
        marginTop: 4,
        color: "#666",
        fontSize: 12,
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
    rowCell: {
        paddingHorizontal: 8,
        justifyContent: "center",
    },
    rowCellText: {
        color: "#1f1f1f",
        fontSize: 12,
        paddingHorizontal: 8,
    },
    productImage: {
        width: 62,
        height: 44,
        borderRadius: 8,
        backgroundColor: "#e6e6e6",
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
    },
    iconBtn: {
        width: 30,
        height: 30,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#cfcfcf",
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
    },
});

export default StockAlerts;
