import React, { useContext } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import AuthGlobal from "../Context/Store/AuthGlobal";
import CartIcon from "./CartIcon";

const PAGE_TITLES = {
    "User Profile": "Profile",
    "My Orders": "Orders",
    "Order Details": "Order Details",
    Wishlist: "Wishlist",
    Notifications: "Notifications",
    "Notification Detail": "Notification",
    "Cart Screen": "Cart",
    Home: "Home",
    Admin: "Dashboard",
};

const HOME_BEHAVIOR_ROUTES = new Set(["User Profile"]);

const AppPageHeader = ({ title }) => {
    const navigation = useNavigation();
    const route = useRoute();
    const context = useContext(AuthGlobal);
    const isAdmin = context?.stateUser?.user?.isAdmin === true;
    const canGoBack = navigation.canGoBack();
    const routeName = String(route?.name || "");
    const resolvedTitle = String(title || PAGE_TITLES[routeName] || routeName || "SnapShop");
    const shouldGoHomeOnLeft = HOME_BEHAVIOR_ROUTES.has(routeName);

    const onLeftPress = () => {
        if (canGoBack && !shouldGoHomeOnLeft) {
            navigation.goBack();
            return;
        }
        const tabNav = navigation.getParent?.();
        if (tabNav) {
            tabNav.navigate("Home");
            return;
        }
        navigation.navigate("Home");
    };

    const onRightPress = () => {
        const tabNav = navigation.getParent?.();
        if (isAdmin) {
            if (tabNav) {
                tabNav.navigate("Admin", { screen: "Dashboard" });
                return;
            }
            navigation.navigate("Admin", { screen: "Dashboard" });
            return;
        }

        if (tabNav) {
            tabNav.navigate("Cart Screen");
            return;
        }
        navigation.navigate("Cart Screen");
    };

    return (
        <View style={styles.header}>
            <TouchableOpacity onPress={onLeftPress} style={styles.sideButton}>
                <Ionicons name={canGoBack && !shouldGoHomeOnLeft ? "chevron-back-outline" : "home-outline"} size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>{resolvedTitle}</Text>
            <TouchableOpacity onPress={onRightPress} style={styles.sideButton}>
                <Ionicons name={isAdmin ? "grid-outline" : "bag-outline"} size={24} color="#000" />
                {!isAdmin ? <CartIcon /> : null}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: 48,
        paddingBottom: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    sideButton: {
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
    },
    headerTitle: {
        flex: 1,
        textAlign: "center",
        fontSize: 20,
        fontWeight: "700",
        color: "#000",
        marginHorizontal: 8,
    },
});

export default AppPageHeader;
