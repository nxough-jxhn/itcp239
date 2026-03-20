/**
 * Main tab navigator: bottom tabs for Home, Cart, Admin, User.
 * Each tab has its own stack (HomeNavigator, CartNavigator, etc.).
 */
import React, { useContext } from "react";
import { View, Text, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import HomeNavigator from "./HomeNavigator";
import CartNavigator from "./CartNavigator";
import CartIcon from "../Shared/CartIcon";
import UserNavigator from "./UserNavigator";
import AdminNavigator from "./AdminNavigator";
import AuthGlobal from "../Context/Store/AuthGlobal";
import MyOrders from "../Screens/User/MyOrders";

const Tab = createBottomTabNavigator();

const TabPillIcon = ({ focused, iconName, label, children }) => {
    if (focused) {
        return (
            <View style={styles.activePill}>
                <Ionicons name={iconName} color="#fff" size={16} />
                <Text style={styles.activePillText}>{label}</Text>
                {children}
            </View>
        );
    }

    return (
        <View style={styles.inactiveIconWrap}>
            <Ionicons name={iconName} color="#4a4a4a" size={24} />
            {children}
        </View>
    );
};

const Main = () => {
    const context = useContext(AuthGlobal);
    const isAdmin = context?.stateUser?.user?.isAdmin === true;
    return (
        <Tab.Navigator
            initialRouteName="Home"
            screenOptions={{
                headerShown: false,
                tabBarHideOnKeyboard: true,
                tabBarShowLabel: false,
                tabBarStyle: styles.tabBar,
                tabBarItemStyle: styles.tabItem,
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeNavigator}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabPillIcon focused={focused} iconName="home-outline" label="Home" />
                    ),
                }}
            />
            {!isAdmin ? (
                <Tab.Screen
                    name="Cart Screen"
                    component={CartNavigator}
                    options={{
                        tabBarIcon: ({ focused }) => (
                            <TabPillIcon focused={focused} iconName="bag-handle-outline" label="Cart">
                                <CartIcon />
                            </TabPillIcon>
                        ),
                    }}
                />
            ) : null}
            {isAdmin ? (
                <Tab.Screen
                    name="Admin"
                    component={AdminNavigator}
                    options={{
                        tabBarIcon: ({ focused }) => (
                            <TabPillIcon focused={focused} iconName="settings-outline" label="Manage" />
                        ),
                    }}
                />
            ) : null}
            {!isAdmin ? (
                <Tab.Screen
                    name="My Orders"
                    component={MyOrders}
                    options={{
                        tabBarIcon: ({ focused }) => (
                            <TabPillIcon focused={focused} iconName="receipt-outline" label="Orders" />
                        ),
                    }}
                />
            ) : null}
            <Tab.Screen
                name="User"
                component={UserNavigator}
                listeners={({ navigation }) => ({
                    tabPress: (event) => {
                        event.preventDefault();
                        navigation.navigate("User", { screen: "User Profile" });
                    },
                })}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabPillIcon focused={focused} iconName="person-outline" label="Profile" />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};

const styles = StyleSheet.create({
    tabBar: {
        height: 78,
        backgroundColor: "#fff",
        borderTopColor: "#e9e9e9",
        borderTopWidth: 1,
        paddingTop: 8,
        paddingBottom: 12,
    },
    tabItem: {
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 6,
    },
    activePill: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#111",
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 7,
        minWidth: 84,
        justifyContent: "center",
    },
    activePillText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "700",
        marginLeft: 6,
    },
    inactiveIconWrap: {
        width: 42,
        alignItems: "center",
        justifyContent: "center",
    },
});

export default Main;
