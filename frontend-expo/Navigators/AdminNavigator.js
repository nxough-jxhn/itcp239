import React, { useContext } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Orders from "../Screens/Admin/Orders";
import Products from "../Screens/Admin/Products";
import Dashboard from "../Screens/Admin/Dashboard";
import ProductForm from "../Screens/Admin/ProductForm";
import Categories from "../Screens/Admin/Categories";
import StockAlerts from "../Screens/Admin/StockAlerts";
import PromoBroadcast from "../Screens/Admin/PromoBroadcast";
import OrderDetails from "../Screens/User/OrderDetails";
import AuthGlobal from "../Context/Store/AuthGlobal";

const Stack = createStackNavigator();

const NotAuthorized = () => {
    const navigation = useNavigation();
    return (
        <View style={styles.center}>
            <View style={styles.badge}>
                <Ionicons name="shield-outline" size={28} color="#111" />
            </View>
            <Text style={styles.title}>Not Authorized</Text>
            <Text style={styles.subtitle}>Admin access required.</Text>
            <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate("User", { screen: "Login" })}>
                <Text style={styles.loginBtnText}>Go to Login</Text>
            </TouchableOpacity>
        </View>
    );
};

const AdminNavigator = () => {
    const context = useContext(AuthGlobal);
    const isAdmin = context?.stateUser?.user?.isAdmin === true;

    if (!isAdmin) {
        return (
            <Stack.Navigator>
                <Stack.Screen name="NotAuthorized" component={NotAuthorized} options={{ title: "Admin" }} />
            </Stack.Navigator>
        );
    }
    return (
        <Stack.Navigator initialRouteName="Dashboard">
            <Stack.Screen
                name="Dashboard"
                component={Dashboard}
                options={({ navigation }) => ({
                    title: "Admin Dashboard",
                    headerTitleAlign: "center",
                    headerLeft: () => (
                        <TouchableOpacity
                            style={styles.drawerBtn}
                            onPress={() => {
                                const tabNav = navigation.getParent?.();
                                const drawerNav = tabNav?.getParent?.();
                                if (typeof drawerNav?.openDrawer === "function") {
                                    drawerNav.openDrawer();
                                }
                            }}
                        >
                            <Ionicons name="menu-outline" size={22} color="#111" />
                        </TouchableOpacity>
                    ),
                })}
            />
            <Stack.Screen name="Products" component={Products} options={{ headerShown: false }} />
            <Stack.Screen name="Categories" component={Categories} options={{ headerShown: false }} />
            <Stack.Screen name="Orders" component={Orders} options={{ headerShown: false }} />
            <Stack.Screen name="Stock Alerts" component={StockAlerts} options={{ headerShown: false }} />
            <Stack.Screen name="Promo Broadcast" component={PromoBroadcast} options={{ headerShown: false }} />
            <Stack.Screen name="Order Details" component={OrderDetails} options={{ headerShown: false }} />
            <Stack.Screen name="ProductForm" component={ProductForm} options={{ headerShown: false }} />
        </Stack.Navigator>
    );
};

const styles = StyleSheet.create({
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        backgroundColor: "#f5f5f5",
    },
    badge: {
        width: 58,
        height: 58,
        borderRadius: 29,
        borderWidth: 1,
        borderColor: "#d5d5d5",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fff",
        marginBottom: 12,
    },
    title: { fontSize: 20, fontWeight: "700", color: "#111", marginBottom: 6 },
    subtitle: { fontSize: 13, color: "#555", marginBottom: 16 },
    loginBtn: {
        height: 42,
        borderRadius: 10,
        backgroundColor: "#111",
        paddingHorizontal: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    loginBtnText: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "700",
    },
    drawerBtn: {
        marginLeft: 12,
        width: 34,
        height: 34,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
});

export default AdminNavigator;
