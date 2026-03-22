import React, { useCallback, useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    Modal,
    Image,
    useWindowDimensions,
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

const STATUS_COLORS = {
    pending: "#9a6700",
    shipped: "#0b69a3",
    delivered: "#0a7a41",
    cancelled: "#b42318",
};
const FALLBACK_USER_IMAGE = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";
const FALLBACK_PRODUCT_IMAGE = "https://cdn.pixabay.com/photo/2012/04/01/17/29/box-23649_960_720.png";
const USERS_PER_PAGE = 5;

function formatDateTime(value) {
    const d = value ? new Date(value) : null;
    if (!d || Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function shortId(value, length = 5) {
    const raw = String(value || "").trim();
    if (!raw) return "-";
    return raw.slice(0, length);
}

function buildAddress(user) {
    const pieces = [
        user?.deliveryAddress1,
        user?.deliveryAddress2,
        user?.deliveryCity,
        user?.deliveryZip,
        user?.deliveryCountry,
    ]
        .map((part) => String(part || "").trim())
        .filter(Boolean);
    return pieces.length ? pieces.join(", ") : "No saved address";
}

function formatCompactDate(value) {
    const d = value ? new Date(value) : null;
    if (!d || Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
}

function sameDay(a, b) {
    return (
        a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate()
    );
}

function computeDailyRevenue(orders = []) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    let todayRevenue = 0;
    let yesterdayRevenue = 0;

    (Array.isArray(orders) ? orders : []).forEach((order) => {
        const status = String(order?.status || "").toLowerCase();
        if (status !== "delivered") return;

        const orderedAt = new Date(order?.dateOrdered || order?.createdAt || Date.now());
        orderedAt.setHours(0, 0, 0, 0);
        const value = Number(order?.totalPrice || 0);

        if (sameDay(orderedAt, now)) {
            todayRevenue += value;
        } else if (sameDay(orderedAt, yesterday)) {
            yesterdayRevenue += value;
        }
    });

    return {
        todayRevenue: toMoney(todayRevenue),
        yesterdayRevenue: toMoney(yesterdayRevenue),
    };
}

function formatPercentDelta(current, previous) {
    const c = Number(current || 0);
    const p = Number(previous || 0);

    if (p <= 0 && c > 0) return "+100% vs yesterday";
    if (p <= 0 && c <= 0) return "0% vs yesterday";

    const delta = ((c - p) / p) * 100;
    const sign = delta >= 0 ? "+" : "";
    return `${sign}${delta.toFixed(1)}% vs yesterday`;
}

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
    const [selectedKey, setSelectedKey] = useState("");
    const chartHeight = 140;
    const points = Array.isArray(data) ? data : [];
    const maxValue = Math.max(1, ...points.map((p) => Number(p.value || 0)));
    const minWidth = Math.max(420, points.length * 56);

    const chartPoints = useMemo(() => {
        if ((!chartWidth && minWidth <= 0) || points.length === 0) return [];
        const leftPad = 10;
        const rightPad = 10;
        const topPad = 10;
        const bottomPad = 18;
        const effectiveWidth = chartWidth || minWidth;
        const usableWidth = Math.max(1, effectiveWidth - leftPad - rightPad);
        const usableHeight = Math.max(1, chartHeight - topPad - bottomPad);
        const step = points.length > 1 ? usableWidth / (points.length - 1) : 0;

        return points.map((p, idx) => {
            const x = leftPad + step * idx;
            const y = topPad + (1 - Number(p.value || 0) / maxValue) * usableHeight;
            return { ...p, x, y };
        });
    }, [points, chartWidth, maxValue]);

    const selectedPoint = chartPoints.find((point) => point.key === selectedKey) || null;

    return (
        <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View
                    style={[styles.lineChartArea, { width: minWidth }]}
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

                    {chartPoints.map((point) => {
                        const active = selectedKey === point.key;
                        return (
                            <TouchableOpacity
                                key={`dot-${point.key}`}
                                style={[styles.pointHitBox, { left: point.x - 12, top: point.y - 12 }]}
                                onPress={() => setSelectedKey(point.key)}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.pointDot, active && styles.pointDotActive]} />
                            </TouchableOpacity>
                        );
                    })}

                    {selectedPoint ? (
                        <View style={[styles.pointTooltip, { left: Math.max(6, selectedPoint.x - 56), top: Math.max(6, selectedPoint.y - 44) }]}>
                            <Text style={styles.pointTooltipDate}>{selectedPoint.label}</Text>
                            <Text style={styles.pointTooltipValue}>$ {Number(selectedPoint.value || 0).toFixed(2)}</Text>
                        </View>
                    ) : null}
                </View>
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={[styles.lineLabelsRow, { width: minWidth }]}>
                    {points.map((point, idx) => {
                        const manyPoints = points.length > 12;
                        const show = !manyPoints || idx % 4 === 0 || idx === points.length - 1;
                        return (
                            <Text key={`label-${point.key}`} style={styles.lineLabelText} numberOfLines={1}>
                                {show ? point.label : ""}
                            </Text>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
};

const OrdersBarChart = ({ data = [], currency = false }) => {
    const rows = Array.isArray(data) ? data : [];
    const maxValue = Math.max(1, ...rows.map((row) => Number(row.value || 0)));
    const chartWidth = Math.max(420, rows.length * 56);

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={[styles.weekChartWrap, { width: chartWidth }]}>
                {rows.map((row) => {
                    const h = Math.max(8, (Number(row.value || 0) / maxValue) * 120);
                    const shownValue = currency
                        ? `$ ${Number(row.value || 0).toFixed(2)}`
                        : String(Number(row.value || 0));
                    return (
                        <View key={row.date || row.key || row.label} style={styles.dayCol}>
                            <Text numberOfLines={1} style={[styles.dayValue, currency && styles.dayValueMoney]}>{shownValue}</Text>
                            <View style={[styles.dayBar, { height: h }]} />
                            <Text style={styles.dayLabel}>{row.label}</Text>
                        </View>
                    );
                })}
            </View>
        </ScrollView>
    );
};

const DashboardKpiCard = ({ icon, title, value, note, accent = "#111", indicator = "" }) => {
    return (
        <View style={styles.kpiCard}>
            <View style={styles.kpiTopRow}>
                <View style={[styles.kpiIconWrap, { borderColor: `${accent}44`, backgroundColor: `${accent}12` }]}>
                    <Ionicons name={icon} size={15} color={accent} />
                </View>
                {indicator ? <Text style={styles.kpiIndicator}>{indicator}</Text> : null}
            </View>
            <Text style={styles.kpiLabel}>{title}</Text>
            <Text style={styles.kpiValue}>{value}</Text>
            <Text style={styles.kpiNote}>{note}</Text>
        </View>
    );
};

const Dashboard = () => {
    const navigation = useNavigation();
    const { width: screenWidth } = useWindowDimensions();
    const compact = screenWidth < 390;
    const tiny = screenWidth < 360;

    const userCols = useMemo(() => {
        if (tiny) {
            return { id: 72, name: 124, registered: 102, role: 84, details: 84 };
        }
        if (compact) {
            return { id: 78, name: 138, registered: 114, role: 90, details: 92 };
        }
        return { id: 84, name: 150, registered: 122, role: 96, details: 98 };
    }, [compact, tiny]);

    const userTableMinWidth = useMemo(
        () => userCols.id + userCols.name + userCols.registered + userCols.role + userCols.details,
        [userCols]
    );

    const reviewCardWidth = useMemo(() => {
        const target = Math.floor(screenWidth - 94);
        return Math.max(218, Math.min(260, target));
    }, [screenWidth]);

    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [revenueFilter, setRevenueFilter] = useState("days");

    const [totals, setTotals] = useState({
        orders: 0,
        revenue: 0,
        products: 0,
        campaigns: 0,
    });
    const [ordersData, setOrdersData] = useState([]);
    const [revenueSeries, setRevenueSeries] = useState([]);
    const [weeklySeries, setWeeklySeries] = useState([]);
    const [kpiMeta, setKpiMeta] = useState({
        pendingOrders: 0,
        lowStockProducts: 0,
        promoCount: 0,
        voucherCount: 0,
        revenueDeltaText: "0% vs yesterday",
    });
    const [users, setUsers] = useState([]);
    const [userPage, setUserPage] = useState(1);
    const [selectedUser, setSelectedUser] = useState(null);
    const [latestReviews, setLatestReviews] = useState([]);

    const loadDashboard = useCallback(async () => {
        try {
            setRefreshing(true);
            setError("");

            const jwt = await getJwtToken();
            const headers = { Authorization: `Bearer ${jwt}` };

            const [ordersRes, productsRes, stockRes, promoRes, usersRes, latestReviewsRes] = await Promise.all([
                    axios.get(`${baseURL}orders`, { headers, timeout: 25000 }),
                    axios.get(`${baseURL}products`, { timeout: 25000 }),
                    axios.get(`${baseURL}stock-alerts`, { headers, timeout: 25000 }),
                    axios.get(`${baseURL}promos`, { headers, timeout: 25000 }),
                    axios.get(`${baseURL}users`, { headers, timeout: 25000 }),
                axios.get(`${baseURL}products/reviews/latest`, {
                    headers,
                    params: { limit: 3 },
                        timeout: 25000,
                }),
            ]);

            const orders = Array.isArray(ordersRes?.data) ? ordersRes.data : [];
            const products = Array.isArray(productsRes?.data) ? productsRes.data : [];
            const stockAlerts = Array.isArray(stockRes?.data) ? stockRes.data : [];
            const campaigns = Array.isArray(promoRes?.data) ? promoRes.data : [];
            const allUsers = Array.isArray(usersRes?.data) ? usersRes.data : [];
            const latest = Array.isArray(latestReviewsRes?.data) ? latestReviewsRes.data : [];

            const orderCount = orders.length;
            const revenue = orders.reduce((sum, order) => sum + Number(order?.totalPrice || 0), 0);

            const pendingOrders = orders.filter((order) => String(order?.status || "").toLowerCase() === "pending").length;
            const lowStockProducts = products.filter((product) => Number(product?.countInStock || 0) <= 10).length;
            const promoCount = campaigns.filter((campaign) => String(campaign?.type || "promo").toLowerCase() === "promo").length;
            const voucherCount = campaigns.filter((campaign) => String(campaign?.type || "promo").toLowerCase() === "voucher").length;
            const revenueDaily = computeDailyRevenue(orders);

            setTotals({
                orders: orderCount,
                revenue,
                products: products.length,
                campaigns: campaigns.length,
            });
            setOrdersData(orders);

            setKpiMeta({
                pendingOrders,
                lowStockProducts,
                promoCount,
                voucherCount,
                revenueDeltaText: formatPercentDelta(revenueDaily.todayRevenue, revenueDaily.yesterdayRevenue),
            });

            setRevenueSeries(buildRevenueSeries(orders, revenueFilter));
            setUsers(allUsers);
            setUserPage(1);
            setLatestReviews(latest);

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

            const activeAlerts = stockAlerts.filter((item) => item?.resolved !== true).length;
            if (activeAlerts > 0 && activeAlerts !== lowStockProducts) {
                setKpiMeta((prev) => ({
                    ...prev,
                    lowStockProducts: Math.max(prev.lowStockProducts, activeAlerts),
                }));
            }
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
    const pendingColor = STATUS_COLORS.pending;
    const totalUserPages = Math.max(1, Math.ceil(users.length / USERS_PER_PAGE));
    const pageStart = (userPage - 1) * USERS_PER_PAGE;
    const pagedUsers = users.slice(pageStart, pageStart + USERS_PER_PAGE);

    const go = (screen) => navigation.navigate(screen);

    const latestOrderByStatus = useMemo(() => {
        const statuses = ["pending", "shipped", "cancelled", "delivered"];
        const result = {};

        statuses.forEach((status) => {
            result[status] = { count: 0, latest: null };
        });

        const sourceOrders = Array.isArray(ordersData) ? ordersData : [];
        sourceOrders.forEach((order) => {
            const key = String(order?.status || "").toLowerCase();
            if (!result[key]) return;
            result[key].count += 1;

            const currentTime = new Date(order?.dateOrdered || order?.createdAt || 0).getTime();
            const latestTime = result[key].latest
                ? new Date(result[key].latest?.dateOrdered || result[key].latest?.createdAt || 0).getTime()
                : -1;

            if (currentTime >= latestTime) {
                result[key].latest = order;
            }
        });

        return result;
    }, [ordersData]);

    const orderStatusCards = useMemo(() => {
        const statuses = ["pending", "shipped", "cancelled", "delivered"];
        return statuses.map((status) => {
            const entry = latestOrderByStatus[status] || { count: 0, latest: null };
            return {
                status,
                count: Number(entry.count || 0),
                latest: entry.latest || null,
            };
        });
    }, [latestOrderByStatus]);

    const goToOrder = (order) => {
        const orderId = order?.id || order?._id;
        if (!orderId) return;
        navigation.navigate("Order Details", { orderId: String(orderId) });
    };

    const openReviewProduct = async (review) => {
        const productId = review?.product?.id || review?.product?._id || review?.product;
        if (!productId) return;
        const item = { id: String(productId), _id: String(productId) };
        const tabNav = navigation.getParent?.();
        tabNav?.navigate("Home", { screen: "Product Detail", params: { item } });
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadDashboard} />}
        >
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.kpiGrid}>
                <DashboardKpiCard
                    icon="receipt-outline"
                    title="Orders"
                    value={String(totals.orders)}
                    note="Total placed orders"
                    accent={pendingColor}
                    indicator={`Pending ${kpiMeta.pendingOrders}`}
                />
                <DashboardKpiCard
                    icon="cash-outline"
                    title="Revenue"
                    value={`$ ${Number(totals.revenue || 0).toFixed(2)}`}
                    note={kpiMeta.revenueDeltaText}
                    accent="#0a7a41"
                />
                <DashboardKpiCard
                    icon="cube-outline"
                    title="Products"
                    value={String(totals.products)}
                    note="Total catalog items"
                    accent="#0b69a3"
                    indicator={`Low stock ${kpiMeta.lowStockProducts}`}
                />
                <DashboardKpiCard
                    icon="megaphone-outline"
                    title="Campaigns"
                    value={String(totals.campaigns)}
                    note="Promos and vouchers"
                    accent="#8a4b14"
                    indicator={`Promo ${kpiMeta.promoCount} | Voucher ${kpiMeta.voucherCount}`}
                />
            </View>

            <View style={styles.sectionDivider} />

            <View style={styles.panel}>
                <View style={[styles.panelHeaderRow, compact && styles.panelHeaderRowStack]}>
                    <Text style={styles.panelTitle}>Revenue Trend</Text>
                    <View style={[styles.filterWrap, compact && styles.filterWrapCompact]}>
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
                <OrdersBarChart data={revenueSeries} currency />
            </View>

            <View style={styles.panel}>
                <View style={styles.panelHeaderRow}>
                    <Text style={styles.panelTitle}>Orders Last 7 Days</Text>
                    <TouchableOpacity style={styles.inlineAction} onPress={() => go("Orders")}>
                        <Text style={styles.inlineActionText}>Open Orders</Text>
                    </TouchableOpacity>
                </View>
                <OrdersBarChart data={weeklySeries} maxWeekly={maxWeekly} />
            </View>

            <View style={styles.panel}>
                <View style={styles.panelHeaderRow}>
                    <Text style={styles.panelTitle}>Users</Text>
                    <Text style={styles.usersCountText}>Total {users.length}</Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={[styles.userTableWrap, { minWidth: userTableMinWidth }]}>
                        <View style={[styles.userTableRow, styles.userTableHeaderRow]}>
                            <Text style={[styles.userHeadCell, { width: userCols.id }]}>User ID</Text>
                            <Text style={[styles.userHeadCell, { width: userCols.name }]}>Name</Text>
                            <Text style={[styles.userHeadCell, { width: userCols.registered }]}>Registered</Text>
                            <Text style={[styles.userHeadCell, { width: userCols.role }]}>Role</Text>
                            <Text style={[styles.userHeadCell, { width: userCols.details }]}>Details</Text>
                        </View>

                        {pagedUsers.length === 0 ? (
                            <View style={styles.userEmptyWrap}>
                                <Text style={styles.userEmptyText}>No users found.</Text>
                            </View>
                        ) : pagedUsers.map((user, idx) => {
                            const id = user?.id || user?._id;
                            const role = user?.isAdmin ? "Admin" : "Customer";
                            const roleColor = user?.isAdmin ? "#374151" : "#0b69a3";
                            return (
                                <View
                                    key={String(id || idx)}
                                    style={[styles.userTableRow, { backgroundColor: idx % 2 === 0 ? "#fff" : "#f7f7f7" }]}
                                >
                                    <Text style={[styles.userBodyCell, { width: userCols.id }]}>{shortId(id, 5)}</Text>
                                    <Text numberOfLines={1} style={[styles.userBodyCell, { width: userCols.name }]}>{String(user?.name || "-")}</Text>
                                    <Text style={[styles.userBodyCell, { width: userCols.registered }]}>{formatDateTime(user?.createdAt)}</Text>
                                    <View style={[styles.userRoleCell, { width: userCols.role }]}>
                                        <View style={[styles.userRoleBadge, { borderColor: `${roleColor}66`, backgroundColor: `${roleColor}15` }]}>
                                            <Text style={[styles.userRoleText, { color: roleColor }]}>{role}</Text>
                                        </View>
                                    </View>
                                    <View style={[styles.userActionCell, { width: userCols.details }]}>
                                        <TouchableOpacity style={styles.userViewBtn} onPress={() => setSelectedUser(user)}>
                                            <Text style={styles.userViewBtnText}>View</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>

                <View style={[styles.userPagerRow, compact && styles.userPagerRowCompact]}>
                    <TouchableOpacity
                        style={[styles.pageBtn, userPage <= 1 && styles.pageBtnDisabled]}
                        onPress={() => setUserPage((prev) => Math.max(1, prev - 1))}
                        disabled={userPage <= 1}
                    >
                        <Text style={[styles.pageBtnText, userPage <= 1 && styles.pageBtnTextDisabled]}>Prev</Text>
                    </TouchableOpacity>

                    <Text style={styles.pageMeta}>Page {userPage} of {totalUserPages}</Text>

                    <TouchableOpacity
                        style={[styles.pageBtn, userPage >= totalUserPages && styles.pageBtnDisabled]}
                        onPress={() => setUserPage((prev) => Math.min(totalUserPages, prev + 1))}
                        disabled={userPage >= totalUserPages}
                    >
                        <Text style={[styles.pageBtnText, userPage >= totalUserPages && styles.pageBtnTextDisabled]}>Next</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.panel}>
                <View style={styles.panelHeaderRow}>
                    <Text style={styles.panelTitle}>Latest Reviews</Text>
                    <TouchableOpacity style={styles.inlineAction} onPress={() => go("Products")}>
                        <Text style={styles.inlineActionText}>Open Products</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.reviewRowWrap}>
                        {latestReviews.length === 0 ? (
                            <View style={styles.reviewEmptyCard}>
                                <Text style={styles.reviewEmptyText}>No reviews yet.</Text>
                            </View>
                        ) : latestReviews.map((review, idx) => {
                            const product = review?.product || {};
                            const reviewer = review?.user || {};
                            const rating = Math.max(1, Math.min(5, Number(review?.rating || 0)));
                            return (
                                <TouchableOpacity
                                    key={String(review?.id || review?._id || idx)}
                                    style={[styles.reviewCard, { width: reviewCardWidth, marginRight: compact ? 8 : 10 }]}
                                    activeOpacity={0.88}
                                    onPress={() => openReviewProduct(review)}
                                >
                                    <Image
                                        source={{ uri: String(product?.image || FALLBACK_PRODUCT_IMAGE) }}
                                        style={styles.reviewCardImage}
                                    />
                                    <View style={styles.reviewCardBody}>
                                        <Text numberOfLines={1} style={styles.reviewProductName}>{String(product?.name || "Product")}</Text>
                                        <Text numberOfLines={1} style={styles.reviewMetaText}>{String(reviewer?.name || "User")}</Text>

                                        <View style={styles.reviewStarRow}>
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Ionicons
                                                    key={`${review?.id || idx}-${star}`}
                                                    name={star <= rating ? "star" : "star-outline"}
                                                    size={12}
                                                    color="#9a6700"
                                                    style={{ marginRight: 1 }}
                                                />
                                            ))}
                                            <Text style={styles.reviewDateText}>{formatCompactDate(review?.createdAt)}</Text>
                                        </View>

                                        <Text numberOfLines={2} style={styles.reviewCommentText}>
                                            {String(review?.comment || "No comment")}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
            </View>

            <View style={styles.panel}>
                <View style={styles.panelHeaderRow}>
                    <Text style={styles.panelTitle}>Latest By Order Status</Text>
                    <TouchableOpacity style={styles.inlineAction} onPress={() => go("Orders")}>
                        <Text style={styles.inlineActionText}>Open Orders</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.statusGrid}>
                    {orderStatusCards.map((card) => {
                        const baseColor = STATUS_COLORS[card.status] || "#444";
                        const orderId = card?.latest?.id || card?.latest?._id;
                        return (
                            <TouchableOpacity
                                key={card.status}
                                style={[
                                    styles.statusCard,
                                    compact ? styles.statusCardStacked : styles.statusCardTwoCol,
                                    { borderColor: `${baseColor}33`, backgroundColor: `${baseColor}10` },
                                ]}
                                activeOpacity={orderId ? 0.85 : 1}
                                onPress={() => (orderId ? goToOrder(card.latest) : null)}
                                disabled={!orderId}
                            >
                                <View style={styles.statusCardTopRow}>
                                    <Text style={[styles.statusCardTitle, { color: baseColor }]}>{card.status.toUpperCase()}</Text>
                                    <Text style={styles.statusCardCount}>{card.count}</Text>
                                </View>
                                <Text style={styles.statusCardSub}>Latest Order</Text>
                                <Text style={styles.statusCardValue}>{orderId ? `#${shortId(orderId, 8)}` : "-"}</Text>
                                <Text style={styles.statusCardDate}>{formatDateTime(card?.latest?.dateOrdered || card?.latest?.createdAt)}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {loading ? <Text style={styles.loadingText}>Loading dashboard...</Text> : null}

            <Modal
                visible={Boolean(selectedUser)}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedUser(null)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedUser(null)}>
                            <Ionicons name="close" size={18} color="#444" />
                        </TouchableOpacity>

                        <View style={styles.modalHeadRow}>
                            <Image
                                source={{ uri: String(selectedUser?.image || "").trim() || FALLBACK_USER_IMAGE }}
                                style={styles.modalAvatar}
                            />
                            <View style={styles.modalHeadTextWrap}>
                                <Text style={styles.modalName}>{String(selectedUser?.name || "Unknown user")}</Text>
                                <Text style={styles.modalSubText}>{selectedUser?.isAdmin ? "Admin" : "Customer"}</Text>
                            </View>
                        </View>

                        <View style={styles.modalBody}>
                            <Text style={styles.modalLabel}>Email</Text>
                            <Text style={styles.modalValue}>{String(selectedUser?.email || "-")}</Text>

                            <Text style={styles.modalLabel}>Phone</Text>
                            <Text style={styles.modalValue}>{String(selectedUser?.phone || "-")}</Text>

                            <Text style={styles.modalLabel}>Registered</Text>
                            <Text style={styles.modalValue}>{formatDateTime(selectedUser?.createdAt)}</Text>

                            <Text style={styles.modalLabel}>Address</Text>
                            <Text style={styles.modalValue}>{buildAddress(selectedUser)}</Text>

                            <Text style={styles.modalLabel}>User ID</Text>
                            <Text style={styles.modalValue}>{String(selectedUser?.id || selectedUser?._id || "-")}</Text>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f2f3f5",
    },
    content: {
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 34,
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
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e7e7e7",
        padding: 12,
        marginBottom: 8,
    },
    kpiTopRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    kpiIconWrap: {
        width: 28,
        height: 28,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    kpiIndicator: {
        color: "#444",
        fontSize: 10,
        fontWeight: "700",
    },
    kpiLabel: {
        marginTop: 8,
        color: "#555",
        fontSize: 12,
        textTransform: "uppercase",
        fontWeight: "700",
    },
    kpiValue: {
        marginTop: 4,
        color: "#111",
        fontSize: 21,
        fontWeight: "700",
    },
    kpiNote: {
        marginTop: 4,
        color: "#666",
        fontSize: 11,
        fontWeight: "600",
    },
    sectionDivider: {
        height: 1,
        backgroundColor: "#e3e5e8",
        marginVertical: 8,
    },
    panel: {
        backgroundColor: "#fff",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e7e7e7",
        padding: 12,
        marginBottom: 8,
    },
    usersCountText: {
        color: "#666",
        fontSize: 11,
        fontWeight: "700",
    },
    panelTitle: {
        color: "#1a1a1a",
        fontWeight: "700",
        marginBottom: 0,
        fontSize: 15,
    },
    panelHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    panelHeaderRowStack: {
        alignItems: "flex-start",
    },
    filterWrap: {
        flexDirection: "row",
    },
    filterWrapCompact: {
        marginTop: 6,
    },
    filterChip: {
        borderWidth: 1,
        borderColor: "#cfcfcf",
        borderRadius: 14,
        paddingHorizontal: 9,
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
        backgroundColor: "#f7f7f7",
        borderWidth: 1,
        borderColor: "#ececec",
        position: "relative",
        overflow: "hidden",
    },
    lineSegment: {
        position: "absolute",
        height: 2,
        backgroundColor: "#1d4ed8",
    },
    pointDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#1d4ed8",
        borderWidth: 1,
        borderColor: "#fff",
    },
    pointDotActive: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#0f3fbf",
    },
    pointHitBox: {
        position: "absolute",
        width: 24,
        height: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    pointTooltip: {
        position: "absolute",
        backgroundColor: "#111",
        borderRadius: 8,
        paddingVertical: 5,
        paddingHorizontal: 8,
    },
    pointTooltipDate: {
        color: "#d7d7d7",
        fontSize: 10,
        fontWeight: "600",
    },
    pointTooltipValue: {
        color: "#fff",
        fontSize: 11,
        fontWeight: "700",
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
        minHeight: 156,
    },
    dayCol: {
        alignItems: "center",
        width: 50,
    },
    dayValue: {
        color: "#444",
        fontSize: 11,
        marginBottom: 4,
        fontWeight: "700",
    },
    dayValueMoney: {
        fontSize: 9,
    },
    dayBar: {
        width: 18,
        borderRadius: 6,
        backgroundColor: "#0f6f68",
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
    inlineAction: {
        borderWidth: 1,
        borderColor: "#cfcfcf",
        borderRadius: 14,
        paddingVertical: 5,
        paddingHorizontal: 10,
        backgroundColor: "#fafafa",
    },
    inlineActionText: {
        color: "#333",
        fontSize: 11,
        fontWeight: "700",
    },
    userTableWrap: {
        borderWidth: 1,
        borderColor: "#e3e3e3",
        borderRadius: 10,
        overflow: "hidden",
        backgroundColor: "#fff",
    },
    userTableHeaderRow: {
        backgroundColor: "#efefef",
    },
    userTableRow: {
        minHeight: 44,
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#ececec",
    },
    userHeadCell: {
        color: "#333",
        fontSize: 11,
        fontWeight: "700",
        paddingHorizontal: 8,
        textTransform: "uppercase",
    },
    userBodyCell: {
        color: "#1f1f1f",
        fontSize: 12,
        fontWeight: "600",
        paddingHorizontal: 8,
    },
    userRoleCell: {
        paddingHorizontal: 8,
    },
    userRoleBadge: {
        alignSelf: "flex-start",
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    userRoleText: {
        fontSize: 10,
        fontWeight: "700",
    },
    userActionCell: {
        paddingHorizontal: 8,
    },
    userViewBtn: {
        borderWidth: 1,
        borderColor: "#c9c9c9",
        borderRadius: 8,
        backgroundColor: "#fff",
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    userViewBtnText: {
        color: "#333",
        fontSize: 11,
        fontWeight: "700",
    },
    userEmptyWrap: {
        minHeight: 72,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fff",
    },
    userEmptyText: {
        color: "#777",
        fontSize: 12,
        fontWeight: "600",
    },
    userPagerRow: {
        marginTop: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    userPagerRowCompact: {
        alignItems: "center",
    },
    pageBtn: {
        borderWidth: 1,
        borderColor: "#cfcfcf",
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 6,
        backgroundColor: "#fff",
    },
    pageBtnDisabled: {
        backgroundColor: "#f2f2f2",
        borderColor: "#dfdfdf",
    },
    pageBtnText: {
        color: "#222",
        fontSize: 12,
        fontWeight: "700",
    },
    pageBtnTextDisabled: {
        color: "#9b9b9b",
    },
    pageMeta: {
        color: "#555",
        fontSize: 12,
        fontWeight: "700",
    },
    reviewRowWrap: {
        flexDirection: "row",
        alignItems: "stretch",
        paddingRight: 6,
    },
    reviewEmptyCard: {
        minWidth: 260,
        minHeight: 110,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#ececec",
        backgroundColor: "#fafafa",
        alignItems: "center",
        justifyContent: "center",
    },
    reviewEmptyText: {
        color: "#777",
        fontSize: 12,
        fontWeight: "600",
    },
    reviewCard: {
        width: 254,
        flexDirection: "row",
        borderWidth: 1,
        borderColor: "#e6e6e6",
        borderRadius: 12,
        backgroundColor: "#fff",
        marginRight: 10,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
    },
    reviewCardImage: {
        width: 82,
        height: "100%",
        minHeight: 110,
        backgroundColor: "#e8e8e8",
    },
    reviewCardBody: {
        flex: 1,
        padding: 8,
    },
    reviewProductName: {
        color: "#111",
        fontSize: 12,
        fontWeight: "700",
    },
    reviewMetaText: {
        marginTop: 2,
        color: "#666",
        fontSize: 11,
        fontWeight: "600",
    },
    reviewStarRow: {
        marginTop: 6,
        flexDirection: "row",
        alignItems: "center",
    },
    reviewDateText: {
        marginLeft: 4,
        color: "#777",
        fontSize: 10,
        fontWeight: "600",
    },
    reviewCommentText: {
        marginTop: 6,
        color: "#383838",
        fontSize: 11,
        lineHeight: 16,
        fontWeight: "600",
    },
    statusGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    statusCard: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        marginBottom: 8,
        minHeight: 94,
    },
    statusCardTwoCol: {
        width: "49%",
    },
    statusCardStacked: {
        width: "100%",
    },
    statusCardTopRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    statusCardTitle: {
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 0.4,
    },
    statusCardCount: {
        color: "#222",
        fontSize: 18,
        fontWeight: "700",
    },
    statusCardSub: {
        marginTop: 6,
        color: "#666",
        fontSize: 10,
        textTransform: "uppercase",
        fontWeight: "700",
    },
    statusCardValue: {
        marginTop: 2,
        color: "#111",
        fontSize: 14,
        fontWeight: "700",
    },
    statusCardDate: {
        marginTop: 2,
        color: "#666",
        fontSize: 11,
        fontWeight: "600",
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.35)",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 18,
    },
    modalCard: {
        width: "100%",
        maxWidth: 420,
        backgroundColor: "#fff",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#dedede",
        padding: 15,
    },
    modalCloseBtn: {
        position: "absolute",
        top: 8,
        right: 8,
        width: 30,
        height: 30,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2,
    },
    modalHeadRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#ececec",
    },
    modalAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#e8e8e8",
        borderWidth: 1,
        borderColor: "#d8d8d8",
    },
    modalHeadTextWrap: {
        marginLeft: 10,
        flex: 1,
    },
    modalName: {
        color: "#111",
        fontSize: 16,
        fontWeight: "700",
    },
    modalSubText: {
        marginTop: 2,
        color: "#666",
        fontSize: 12,
        fontWeight: "600",
    },
    modalBody: {
        paddingTop: 10,
    },
    modalLabel: {
        color: "#666",
        fontSize: 11,
        fontWeight: "700",
        textTransform: "uppercase",
        marginTop: 8,
    },
    modalValue: {
        marginTop: 2,
        color: "#1d1d1d",
        fontSize: 13,
        fontWeight: "600",
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
