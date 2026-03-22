import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    RefreshControl,
    TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import AuthGlobal from "../../Context/Store/AuthGlobal";
import { getNotificationTarget } from "../../assets/common/notificationRouting";
import {
    clearStoredNotifications,
    getStoredNotifications,
    markNotificationRead,
    upsertNotification,
} from "../../assets/common/notificationCenterStorage";
import AppPageHeader from "../../Shared/AppPageHeader";

const NotificationCenter = () => {
    const navigation = useNavigation();
    const context = React.useContext(AuthGlobal);
    const [notifications, setNotifications] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [typeFilter, setTypeFilter] = useState("all");
    const [readFilter, setReadFilter] = useState("all");

    const getType = (item) => {
        const data = item?.data || {};
        const type = String(data.type || "").toLowerCase();
        const route = String(data.route || "").toLowerCase();
        const title = String(item?.title || "").toLowerCase();
        const body = String(item?.body || "").toLowerCase();

        if (type === "voucher") return "voucher";
        if (type === "wishlist") return "promo";
        if (type === "promo" || route === "notifications") return "promo";
        if (route === "order-details" || route === "admin-orders" || data.orderId) return "order";
        if (title.includes("stock") || body.includes("stock")) return "stock";
        return "other";
    };

    const loadNotifications = useCallback(async () => {
        setRefreshing(true);
        try {
            const delivered = await Notifications.getPresentedNotificationsAsync();
            const deliveredMapped = delivered.map((n) => ({
                id: n.request.identifier,
                title: n.request.content.title || "Notification",
                body: n.request.content.body || "",
                date: n.date ? new Date(n.date).toISOString() : new Date().toISOString(),
                data: n.request.content.data || {},
                read: false,
            }));

            await Promise.all(deliveredMapped.map((item) => upsertNotification(item)));
            const stored = await getStoredNotifications();
            setNotifications(stored);
        } catch (err) {
            console.log("Error loading notifications:", err.message);
        } finally {
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadNotifications();
        }, [loadNotifications])
    );

    const clearAll = async () => {
        await Notifications.dismissAllNotificationsAsync();
        await clearStoredNotifications();
        setNotifications([]);
    };

    const matchesType = (item) => {
        if (typeFilter === "all") return true;
        return getType(item) === typeFilter;
    };

    const unreadItems = notifications.filter((item) => !item?.read).filter(matchesType);
    const readItems = notifications.filter((item) => item?.read).filter(matchesType);

    const showUnread = readFilter === "all" || readFilter === "unread";
    const showRead = readFilter === "all" || readFilter === "read";

    const openNotification = (item, options = {}) => {
        if (!item) return;
        const shouldMarkOpened = options.markOpened !== false;

        if (shouldMarkOpened && item?.id) {
            Notifications.dismissNotificationAsync(item.id).catch(() => {});
            markNotificationRead(item.id, new Date())
                .then((updated) => setNotifications(updated))
                .catch(() => {});
        }

        const data = item?.data || {};
        const isAdmin = context?.stateUser?.user?.isAdmin === true;
        const target = getNotificationTarget({ data, isAdmin });
        const notificationPayload = {
            notification: {
                title: item.title,
                body: item.body,
                date: item.date,
                data,
            },
        };

        if (!target) {
            navigation.navigate("Notification Detail", notificationPayload);
            return;
        }

        // Handle notification detail first so payload isn't lost by generic tab routing.
        if (target.stackScreen === "Notification Detail") {
            navigation.navigate("Notification Detail", {
                ...target.params,
                ...notificationPayload,
            });
            return;
        }

        if (target.tab === "Admin" || target.tab === "Home" || target.tab === "User") {
            const tabNav = navigation.getParent?.();
            const drawerNav = tabNav?.getParent?.();

            if (tabNav?.navigate) {
                tabNav.navigate(target.tab, {
                    screen: target.stackScreen,
                    params: target.params,
                });
            } else if (drawerNav?.navigate) {
                drawerNav.navigate("PeakPlay", {
                    screen: target.tab,
                    params: {
                        screen: target.stackScreen,
                        params: target.params,
                    },
                });
            } else if (target.tab === "User") {
                navigation.navigate(target.stackScreen, target.params);
            } else {
                navigation.navigate(target.stackScreen, target.params);
            }
            return;
        }

        navigation.navigate(target.stackScreen, target.params);
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => openNotification(item)}>
            <View style={styles.iconContainer}>
                <Ionicons name="notifications" size={21} color="#111" />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
                <Text style={styles.date}>
                    {new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString()}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
    );

    const renderOpenedItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.card, styles.openedCard]}
            activeOpacity={0.8}
            onPress={() => openNotification(item, { markOpened: false })}
        >
            <View style={styles.iconContainer}>
                <Ionicons name="mail-open-outline" size={20} color="#4b4b4b" />
            </View>
            <View style={styles.textContainer}>
                <Text style={[styles.title, styles.openedTitle]}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
                <Text style={styles.date}>
                    Opened: {(item.openedAt ? new Date(item.openedAt) : item.date).toLocaleDateString()} {(item.openedAt ? new Date(item.openedAt) : item.date).toLocaleTimeString()}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <AppPageHeader />
            {notifications.length > 0 && (
                <TouchableOpacity style={styles.clearBtn} onPress={clearAll}>
                    <Text style={styles.clearText}>Clear All</Text>
                </TouchableOpacity>
            )}
            <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Type</Text>
                <View style={styles.filterRow}>
                    {["all", "promo", "voucher", "order", "stock"].map((type) => (
                        <TouchableOpacity
                            key={type}
                            style={[styles.filterChip, typeFilter === type && styles.filterChipActive]}
                            onPress={() => setTypeFilter(type)}
                        >
                            <Text style={[styles.filterChipText, typeFilter === type && styles.filterChipTextActive]}>
                                {type.toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.filterLabel}>Read State</Text>
                <View style={styles.filterRow}>
                    {[
                        { key: "all", label: "ALL" },
                        { key: "unread", label: "UNREAD" },
                        { key: "read", label: "OPENED" },
                    ].map((state) => (
                        <TouchableOpacity
                            key={state.key}
                            style={[styles.filterChip, readFilter === state.key && styles.filterChipActive]}
                            onPress={() => setReadFilter(state.key)}
                        >
                            <Text style={[styles.filterChipText, readFilter === state.key && styles.filterChipTextActive]}>
                                {state.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {unreadItems.length === 0 && readItems.length === 0 ? (
                <View style={styles.empty}>
                    <Ionicons name="notifications-off-outline" size={60} color="#ccc" />
                    <Text style={styles.emptyText}>No notifications yet</Text>
                    <Text style={styles.emptySubtext}>
                        No notifications match the current filters.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={showUnread ? unreadItems : []}
                    keyExtractor={(item) => `active-${item.id}`}
                    renderItem={renderItem}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={loadNotifications} />
                    }
                    ListHeaderComponent={
                        showUnread && unreadItems.length > 0 ? (
                            <Text style={styles.sectionTitle}>Unread / Active Notifications</Text>
                        ) : null
                    }
                    ListFooterComponent={
                        showRead && readItems.length > 0 ? (
                            <View style={styles.openedSection}>
                                <Text style={styles.sectionTitle}>Opened Notifications</Text>
                                <FlatList
                                    data={readItems}
                                    keyExtractor={(item) => `opened-${item.id}`}
                                    renderItem={renderOpenedItem}
                                    scrollEnabled={false}
                                />
                            </View>
                        ) : null
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f2f2f2" },
    filterSection: {
        paddingHorizontal: 12,
        paddingBottom: 8,
    },
    filterLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: "#666",
        marginBottom: 6,
        marginTop: 4,
        textTransform: "uppercase",
    },
    filterRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 4,
    },
    filterChip: {
        borderWidth: 1,
        borderColor: "#cfcfcf",
        borderRadius: 16,
        paddingVertical: 4,
        paddingHorizontal: 9,
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: "#fff",
    },
    filterChipActive: {
        backgroundColor: "#111",
        borderColor: "#111",
    },
    filterChipText: {
        color: "#444",
        fontSize: 10,
        fontWeight: "700",
    },
    filterChipTextActive: {
        color: "#fff",
    },
    clearBtn: {
        alignSelf: "flex-end",
        padding: 12,
        paddingBottom: 4,
    },
    clearText: { color: "#111", fontWeight: "600", fontSize: 12 },
    sectionTitle: {
        marginHorizontal: 12,
        marginTop: 6,
        marginBottom: 6,
        color: "#555",
        fontWeight: "700",
        fontSize: 12,
        textTransform: "uppercase",
    },
    card: {
        flexDirection: "row",
        backgroundColor: "#fff",
        marginHorizontal: 12,
        marginVertical: 4,
        padding: 12,
        borderRadius: 11,
        borderWidth: 1,
        borderColor: "#dfdfdf",
        elevation: 0,
    },
    openedCard: {
        opacity: 0.9,
        backgroundColor: "#fafafa",
    },
    iconContainer: {
        width: 34,
        alignItems: "center",
        justifyContent: "center",
    },
    textContainer: { flex: 1 },
    title: { fontSize: 14, fontWeight: "700", color: "#1a1a1a", marginBottom: 2 },
    openedTitle: { color: "#444" },
    body: { fontSize: 12, color: "#333", marginBottom: 4 },
    date: { fontSize: 10, color: "#666" },
    openedSection: {
        marginTop: 8,
        paddingBottom: 10,
    },
    empty: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 120,
        paddingHorizontal: 40,
    },
    emptyText: { fontSize: 16, fontWeight: "600", color: "#666", marginTop: 16 },
    emptySubtext: { fontSize: 12, color: "#888", textAlign: "center", marginTop: 8 },
});

export default NotificationCenter;
