import React, { useCallback, useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
} from "react-native";
import axios from "axios";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import baseURL from "../../assets/common/baseurl";
import { getJwtToken } from "../../assets/common/authToken";

const REVENUE_FILTERS = [
    { key: "days", label: "Days" },
    { key: "30days", label: "30 Days" },
    { key: "months", label: "Months" },
];

const toMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

function buildRevenueSeries(orders = [], filter = "days") {
    const safeOrders = Array.isArray(orders) ? orders : [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (filter === "30days") {
        const days = [...Array(30)].map((_, idx) => {
            const d = new Date(now);
            d.setDate(d.getDate() - (29 - idx));
            return d;
        });

        const map = new Map(days.map((date) => [date.toISOString().slice(0, 10), 0]));
        safeOrders.forEach((order) => {
            const rawDate = order?.dateOrdered || order?.createdAt;
            const key = new Date(rawDate).toISOString().slice(0, 10);
            if (map.has(key)) {
                map.set(key, toMoney(map.get(key) + Number(order?.totalPrice || 0)));
            }
        });

        return [...map.entries()].map(([key, value]) => ({
            key,
            label: key.slice(5),
            value: toMoney(value),
        }));
    }

    if (filter === "months") {
        const months = [...Array(6)].map((_, idx) => {
            const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
            return d;
        });

        const map = new Map(months.map((date) => [date.toISOString().slice(0, 7), 0]));
        safeOrders.forEach((order) => {
            const rawDate = order?.dateOrdered || order?.createdAt;
            const key = new Date(rawDate).toISOString().slice(0, 7);
            if (map.has(key)) {
                map.set(key, toMoney(map.get(key) + Number(order?.totalPrice || 0)));
            }
        });

        return [...map.entries()].map(([key, value]) => ({
            key,
            label: key.slice(2),
            value: toMoney(value),
        }));
    }

    const days = [...Array(7)].map((_, idx) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (6 - idx));
        return d;
    });

    const map = new Map(days.map((date) => [date.toISOString().slice(0, 10), 0]));
    safeOrders.forEach((order) => {
        const rawDate = order?.dateOrdered || order?.createdAt;
        const key = new Date(rawDate).toISOString().slice(0, 10);
        if (map.has(key)) {
            map.set(key, toMoney(map.get(key) + Number(order?.totalPrice || 0)));
        }
    });

    return [...map.entries()].map(([key, value]) => ({
        key,
        label: key.slice(5),
        value: toMoney(value),
    }));
}

const RevenueLineChart = ({ data = [] }) => {
    const [chartWidth, setChartWidth] = useState(0);
    const chartHeight = 140;
    const points = Array.isArray(data) ? data : [];
    const maxValue = Math.max(1, ...points.map((p) => Number(p.value || 0)));

    const chartPoints = useMemo(() => {
        if (!chartWidth || points.length === 0) return [];
        const leftPad = 10;
        const rightPad = 10;
        const topPad = 10;
        const bottomPad = 18;
        const usableWidth = Math.max(1, chartWidth - leftPad - rightPad);
        const usableHeight = Math.max(1, chartHeight - topPad - bottomPad);
        const step = points.length > 1 ? usableWidth / (points.length - 1) : 0;

        return points.map((p, idx) => {
            const x = leftPad + step * idx;
            const y = topPad + (1 - Number(p.value || 0) / maxValue) * usableHeight;
            return { ...p, x, y };
        });
    }, [points, chartWidth, maxValue]);

    return (
        <View>
            <View
                style={styles.lineChartArea}
                onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}
            >
                {chartPoints.map((point, idx) => {
                    if (idx === 0) return null;
                    const prev = chartPoints[idx - 1];
                    const dx = point.x - prev.x;
                    const dy = point.y - prev.y;
                    const length = Math.sqrt(dx * dx + dy * dy);
                    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
                    return (
                        <View
                            key={`seg-${point.key}`}
                            style={[
                                styles.lineSegment,
                                {
                                    left: prev.x,
                                    top: prev.y,
                                    width: length,
                                    transform: [{ rotateZ: `${angle}deg` }],
                                },
                            ]}
                        />
                    );
                })}

                {chartPoints.map((point) => (
                    <View key={`dot-${point.key}`} style={[styles.pointDot, { left: point.x - 4, top: point.y - 4 }]} />
                ))}
            </View>

            <View style={styles.lineLabelsRow}>
                {points.map((point, idx) => {
                    const manyPoints = points.length > 12;
                    const show = !manyPoints || idx % 5 === 0 || idx === points.length - 1;
                    return (
                    <Text key={`label-${point.key}`} style={styles.lineLabelText} numberOfLines={1}>
                        {show ? point.label : ""}
                    </Text>
                    );
                })}
            </View>
        </View>
    );
};

const Dashboard = () => {
    const navigation = useNavigation();
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [revenueFilter, setRevenueFilter] = useState("days");

    const [totals, setTotals] = useState({
        orders: 0,
        revenue: 0,
        products: 0,
        activeCampaigns: 0,
        openStockAlerts: 0,
    });
    const [revenueSeries, setRevenueSeries] = useState([]);
    const [weeklySeries, setWeeklySeries] = useState([]);

    const loadDashboard = useCallback(async () => {
        try {
            setRefreshing(true);
            setError("");

            const jwt = await getJwtToken();
            const headers = { Authorization: `Bearer ${jwt}` };

            const [ordersRes, productsRes, stockRes, promoRes] = await Promise.all([
                axios.get(`${baseURL}orders`, { headers, timeout: 9000 }),
                axios.get(`${baseURL}products`, { timeout: 9000 }),
                axios.get(`${baseURL}stock-alerts`, { headers, timeout: 9000 }),
                axios.get(`${baseURL}promos`, { headers, timeout: 9000 }),
            ]);

            const orders = Array.isArray(ordersRes?.data) ? ordersRes.data : [];
            const products = Array.isArray(productsRes?.data) ? productsRes.data : [];
            const stockAlerts = Array.isArray(stockRes?.data) ? stockRes.data : [];
            const campaigns = Array.isArray(promoRes?.data) ? promoRes.data : [];

            const orderCount = orders.length;
            const revenue = orders.reduce((sum, order) => sum + Number(order?.totalPrice || 0), 0);
            const activeCampaigns = campaigns.filter((campaign) => {
                const status = String(campaign?.status || "").toLowerCase();
                return status === "active" || status === "scheduled";
            }).length;

            setTotals({
                orders: orderCount,
                revenue,
                products: products.length,
                activeCampaigns,
                openStockAlerts: stockAlerts.length,
            });

            setRevenueSeries(buildRevenueSeries(orders, revenueFilter));

            const days = [...Array(7)].map((_, idx) => {
                const d = new Date();
                d.setHours(0, 0, 0, 0);
                d.setDate(d.getDate() - (6 - idx));
                return d;
            });

            const dayMap = new Map(
                days.map((date) => [date.toISOString().slice(0, 10), 0])
            );

            orders.forEach((order) => {
                const rawDate = order?.dateOrdered || order?.createdAt;
                const key = new Date(rawDate).toISOString().slice(0, 10);
                if (dayMap.has(key)) {
                    dayMap.set(key, dayMap.get(key) + 1);
                }
            });

            const weekly = [...dayMap.entries()].map(([date, count]) => ({
                date,
                label: date.slice(5),
                value: count,
            }));
            setWeeklySeries(weekly);
        } catch (e) {
            setError(e?.response?.data?.message || "Failed to load dashboard");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [revenueFilter]);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            loadDashboard();
            return () => {};
        }, [loadDashboard])
    );

    const maxWeekly = Math.max(1, ...weeklySeries.map((item) => Number(item.value || 0)));

    const go = (screen) => navigation.navigate(screen);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadDashboard} />}
        >
            <Text style={styles.heading}>Admin Dashboard</Text>
            <Text style={styles.subheading}>Snapshot of operations and trends</Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.kpiGrid}>
                <View style={styles.kpiCard}>
                    <Text style={styles.kpiLabel}>Orders</Text>
                    <Text style={styles.kpiValue}>{totals.orders}</Text>
                </View>
                <View style={styles.kpiCard}>
                    <Text style={styles.kpiLabel}>Revenue</Text>
                    <Text style={styles.kpiValue}>$ {Number(totals.revenue || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.kpiCard}>
                    <Text style={styles.kpiLabel}>Products</Text>
                    <Text style={styles.kpiValue}>{totals.products}</Text>
                </View>
                <View style={styles.kpiCard}>
                    <Text style={styles.kpiLabel}>Active Campaigns</Text>
                    <Text style={styles.kpiValue}>{totals.activeCampaigns}</Text>
                </View>
                <View style={styles.kpiCardWide}>
                    <Text style={styles.kpiLabel}>Open Stock Alerts</Text>
                    <Text style={styles.kpiValue}>{totals.openStockAlerts}</Text>
                </View>
            </View>

            <View style={styles.panel}>
                <View style={styles.panelHeaderRow}>
                    <Text style={styles.panelTitle}>Chart 1: Revenue Trend</Text>
                    <View style={styles.filterWrap}>
                        {REVENUE_FILTERS.map((item) => (
                            <TouchableOpacity
                                key={item.key}
                                style={[styles.filterChip, revenueFilter === item.key && styles.filterChipActive]}
                                onPress={() => setRevenueFilter(item.key)}
                            >
                                <Text style={[styles.filterChipText, revenueFilter === item.key && styles.filterChipTextActive]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
                <RevenueLineChart data={revenueSeries} />
            </View>

            <View style={styles.panel}>
                <Text style={styles.panelTitle}>Chart 2: Orders Last 7 Days</Text>
                <View style={styles.weekChartWrap}>
                    {weeklySeries.map((row) => {
                        const h = Math.max(8, (Number(row.value || 0) / maxWeekly) * 120);
                        return (
                            <View key={row.date} style={styles.dayCol}>
                                <Text style={styles.dayValue}>{row.value}</Text>
                                <View style={[styles.dayBar, { height: h }]} />
                                <Text style={styles.dayLabel}>{row.label}</Text>
                            </View>
                        );
                    })}
                </View>
            </View>

            <View style={styles.panel}>
                <Text style={styles.panelTitle}>Quick Actions</Text>
                <View style={styles.actionsWrap}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => go("Orders")}>
                        <Ionicons name="receipt-outline" size={17} color="#fff" />
                        <Text style={styles.actionText}>Orders</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => go("Products")}>
                        <Ionicons name="cube-outline" size={17} color="#fff" />
                        <Text style={styles.actionText}>Products</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => go("Stock Alerts")}>
                        <Ionicons name="warning-outline" size={17} color="#fff" />
                        <Text style={styles.actionText}>Stock Alerts</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => go("Promo Broadcast")}>
                        <Ionicons name="megaphone-outline" size={17} color="#fff" />
                        <Text style={styles.actionText}>Promos</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? <Text style={styles.loadingText}>Loading dashboard...</Text> : null}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f4f5f7",
    },
    content: {
        padding: 14,
        paddingBottom: 30,
    },
    heading: {
        fontSize: 24,
        fontWeight: "700",
        color: "#111",
    },
    subheading: {
        marginTop: 2,
        marginBottom: 12,
        color: "#555",
    },
    errorText: {
        color: "#b00020",
        marginBottom: 8,
        fontWeight: "600",
    },
    kpiGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    kpiCard: {
        width: "49%",
        backgroundColor: "#fff",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#ececec",
        padding: 10,
        marginBottom: 10,
    },
    kpiCardWide: {
        width: "100%",
        backgroundColor: "#fff",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#ececec",
        padding: 10,
        marginBottom: 10,
    },
    kpiLabel: {
        color: "#666",
        fontSize: 12,
        textTransform: "uppercase",
        fontWeight: "700",
    },
    kpiValue: {
        marginTop: 4,
        color: "#111",
        fontSize: 22,
        fontWeight: "700",
    },
    panel: {
        backgroundColor: "#fff",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#ececec",
        padding: 12,
        marginBottom: 10,
    },
    panelTitle: {
        color: "#1a1a1a",
        fontWeight: "700",
        marginBottom: 10,
        fontSize: 15,
    },
    panelHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    filterWrap: {
        flexDirection: "row",
    },
    filterChip: {
        borderWidth: 1,
        borderColor: "#cfcfcf",
        borderRadius: 14,
        paddingHorizontal: 8,
        paddingVertical: 5,
        marginLeft: 6,
        backgroundColor: "#fff",
    },
    filterChipActive: {
        backgroundColor: "#111",
        borderColor: "#111",
    },
    filterChipText: {
        color: "#555",
        fontSize: 11,
        fontWeight: "700",
    },
    filterChipTextActive: {
        color: "#fff",
    },
    lineChartArea: {
        height: 140,
        borderRadius: 8,
        backgroundColor: "#f8fafc",
        borderWidth: 1,
        borderColor: "#edf2f7",
        position: "relative",
        overflow: "hidden",
    },
    lineSegment: {
        position: "absolute",
        height: 2,
        backgroundColor: "#1d4ed8",
    },
    pointDot: {
        position: "absolute",
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#1d4ed8",
    },
    lineLabelsRow: {
        marginTop: 8,
        flexDirection: "row",
        justifyContent: "space-between",
    },
    lineLabelText: {
        color: "#666",
        fontSize: 10,
        fontWeight: "600",
        width: 36,
        textAlign: "center",
    },
    weekChartWrap: {
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        paddingTop: 6,
    },
    dayCol: {
        alignItems: "center",
        flex: 1,
    },
    dayValue: {
        color: "#444",
        fontSize: 11,
        marginBottom: 4,
        fontWeight: "700",
    },
    dayBar: {
        width: 20,
        borderRadius: 6,
        backgroundColor: "#0f766e",
    },
    dayLabel: {
        marginTop: 5,
        color: "#666",
        fontSize: 10,
        fontWeight: "600",
    },
    actionsWrap: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    actionBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#111",
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginRight: 8,
        marginBottom: 8,
    },
    actionText: {
        color: "#fff",
        marginLeft: 6,
        fontWeight: "700",
        fontSize: 12,
    },
    loadingText: {
        color: "#777",
        textAlign: "center",
        marginTop: 4,
    },
});

export default Dashboard;
