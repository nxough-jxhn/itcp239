import { useNavigation } from "@react-navigation/native";
import React, { useContext, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AuthGlobal from "../Context/Store/AuthGlobal";
import { logoutUser } from "../Context/Actions/Auth.actions";

const DrawerContent = (props) => {
    const [active, setActive] = useState("Home");
    const [productsOpen, setProductsOpen] = useState(false);
    const navigation = useNavigation();
    const drawerNavigation = props?.navigation;
    const context = useContext(AuthGlobal);
    const authDispatch = context?.dispatch;
    const isAdmin = context?.stateUser?.user?.isAdmin === true;

    const closeDrawerSafe = () => {
        if (typeof drawerNavigation?.closeDrawer === "function") {
            drawerNavigation.closeDrawer();
        }
    };

    const onClick = (screen, onPress) => {
        setActive(screen);
        onPress?.();
        closeDrawerSafe();
    };

    const customerMenuItems = [
        {
            key: "Home",
            label: "Home",
            icon: "home-outline",
            onPress: () => navigation.navigate("PeakPlay", { screen: "Home" }),
        },
        {
            key: "My Profile",
            label: "My Profile",
            icon: "person-outline",
            onPress: () => navigation.navigate("PeakPlay", { screen: "User", params: { screen: "User Profile" } }),
        },
        {
            key: "My Orders",
            label: "My Orders",
            icon: "receipt-outline",
            onPress: () => navigation.navigate("PeakPlay", { screen: "My Orders" }),
        },
        {
            key: "Wishlist",
            label: "Wishlist",
            icon: "heart-circle-outline",
            onPress: () => navigation.navigate("PeakPlay", { screen: "User", params: { screen: "Wishlist" } }),
        },
        {
            key: "Notifications",
            label: "Notifications",
            icon: "notifications-outline",
            onPress: () => navigation.navigate("PeakPlay", { screen: "User", params: { screen: "Notifications" } }),
        },
    ];

    const adminMenuItems = [
        {
            key: "Dashboard",
            label: "Dashboard",
            icon: "analytics-outline",
            onPress: () => navigation.navigate("PeakPlay", { screen: "Admin", params: { screen: "Dashboard" } }),
        },
        {
            key: "My Profile",
            label: "Profile",
            icon: "person-outline",
            onPress: () => navigation.navigate("PeakPlay", { screen: "User", params: { screen: "User Profile" } }),
        },
        {
            key: "Orders",
            label: "Orders",
            icon: "receipt-outline",
            onPress: () => navigation.navigate("PeakPlay", { screen: "Admin", params: { screen: "Orders" } }),
        },
        {
            key: "Stock Alerts",
            label: "Stock Alerts",
            icon: "alert-circle-outline",
            onPress: () => navigation.navigate("PeakPlay", { screen: "Admin", params: { screen: "Stock Alerts" } }),
        },
        {
            key: "Notifications",
            label: "Notifications",
            icon: "notifications-outline",
            onPress: () => navigation.navigate("PeakPlay", { screen: "User", params: { screen: "Notifications" } }),
        },
    ];

    const menuItems = isAdmin ? adminMenuItems : customerMenuItems;

    const productsChildren = [
        {
            key: "Products",
            label: "Product Management",
            onPress: () => navigation.navigate("PeakPlay", { screen: "Admin", params: { screen: "Products" } }),
        },
        {
            key: "Categories",
            label: "Category Management",
            onPress: () => navigation.navigate("PeakPlay", { screen: "Admin", params: { screen: "Categories" } }),
        },
        {
            key: "Promo Broadcast",
            label: "Promo % Voucher Management",
            onPress: () => navigation.navigate("PeakPlay", { screen: "Admin", params: { screen: "Promo Broadcast" } }),
        },
    ];

    return (
        <View style={styles.container}>
            <View>
                <Text style={styles.title}>Menu</Text>
                {menuItems.map((item) => {
                    const focused = active === item.key;
                    return (
                        <TouchableOpacity
                            key={item.key}
                            style={[styles.item, focused && styles.itemActive]}
                            onPress={() => onClick(item.key, item.onPress)}
                        >
                            <Ionicons name={item.icon} size={18} color={focused ? "#fff" : "#222"} />
                            <Text style={[styles.itemText, focused && styles.itemTextActive]}>{item.label}</Text>
                        </TouchableOpacity>
                    );
                })}

                {isAdmin ? (
                    <View style={styles.dropdownWrap}>
                        <TouchableOpacity
                            style={[styles.item, active === "ProductsGroup" && styles.itemActive]}
                            onPress={() => setProductsOpen((prev) => !prev)}
                        >
                            <Ionicons
                                name="cube-outline"
                                size={18}
                                color={active === "ProductsGroup" ? "#fff" : "#222"}
                            />
                            <Text style={[styles.itemText, active === "ProductsGroup" && styles.itemTextActive]}>Products</Text>
                            <Ionicons
                                name={productsOpen ? "chevron-up-outline" : "chevron-down-outline"}
                                size={16}
                                color={active === "ProductsGroup" ? "#fff" : "#222"}
                                style={{ marginLeft: "auto" }}
                            />
                        </TouchableOpacity>

                        {productsOpen
                            ? productsChildren.map((child) => {
                                const focused = active === child.key;
                                return (
                                    <TouchableOpacity
                                        key={child.key}
                                        style={[styles.subItem, focused && styles.subItemActive]}
                                        onPress={() => onClick(child.key, child.onPress)}
                                    >
                                        <Text style={[styles.subItemText, focused && styles.subItemTextActive]}>- {child.label}</Text>
                                    </TouchableOpacity>
                                );
                            })
                            : null}
                    </View>
                ) : null}
            </View>

            <TouchableOpacity
                style={styles.logoutButton}
                onPress={() => {
                    if (authDispatch) {
                        logoutUser(authDispatch);
                    }
                    navigation.navigate("PeakPlay", { screen: "Home" });
                    closeDrawerSafe();
                }}
            >
                <Ionicons name="log-out-outline" size={18} color="#fff" />
                <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        paddingTop: 50,
        paddingHorizontal: 14,
        justifyContent: "space-between",
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
        color: "#111",
        marginBottom: 12,
    },
    item: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginBottom: 8,
        backgroundColor: "#f4f4f4",
    },
    itemActive: {
        backgroundColor: "#111",
    },
    itemText: {
        marginLeft: 8,
        color: "#222",
        fontWeight: "600",
        fontSize: 14,
    },
    itemTextActive: {
        color: "#fff",
    },
    dropdownWrap: {
        marginTop: 2,
    },
    subItem: {
        marginLeft: 16,
        marginBottom: 8,
        borderRadius: 10,
        backgroundColor: "#f1f1f1",
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    subItemActive: {
        backgroundColor: "#1f1f1f",
    },
    subItemText: {
        color: "#333",
        fontWeight: "600",
        fontSize: 13,
    },
    subItemTextActive: {
        color: "#fff",
    },
    logoutButton: {
        marginBottom: 24,
        backgroundColor: "#111",
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    logoutButtonText: {
        color: "#fff",
        fontWeight: "700",
        marginLeft: 8,
    },
});

export default DrawerContent;
