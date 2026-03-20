import React, { useContext } from "react";
import { View, Text, StyleSheet, Button } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";
import Orders from "../Screens/Admin/Orders";
import Products from "../Screens/Admin/Products";
import Dashboard from "../Screens/Admin/Dashboard";
import ProductForm from "../Screens/Admin/ProductForm";
import Categories from "../Screens/Admin/Categories";
import StockAlerts from "../Screens/Admin/StockAlerts";
import PromoBroadcast from "../Screens/Admin/PromoBroadcast";
import AuthGlobal from "../Context/Store/AuthGlobal";

const Stack = createStackNavigator();

const NotAuthorized = () => {
    const navigation = useNavigation();
    return (
        <View style={styles.center}>
            <Text style={styles.title}>Not authorized</Text>
            <Text style={styles.subtitle}>Admin access required.</Text>
            <Button title="Go to Login" onPress={() => navigation.navigate("User", { screen: "Login" })} />
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
            <Stack.Screen name="Dashboard" component={Dashboard} options={{ title: "Admin Dashboard" }} />
            <Stack.Screen name="Products" component={Products} options={{ title: "Products" }} />
            <Stack.Screen name="Categories" component={Categories} />
            <Stack.Screen name="Orders" component={Orders} />
            <Stack.Screen name="Stock Alerts" component={StockAlerts} />
            <Stack.Screen name="Promo Broadcast" component={PromoBroadcast} options={{ title: "Promo Manager" }} />
            <Stack.Screen name="ProductForm" component={ProductForm} />
        </Stack.Navigator>
    );
};

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
    title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
    subtitle: { fontSize: 14, marginBottom: 16 },
});

export default AdminNavigator;
