import React, { useContext } from "react";
import { View, Text, StyleSheet } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import Cart from "../Screens/Cart/Cart";
import CheckoutNavigator from "./CheckoutNavigator";
import AuthGlobal from "../Context/Store/AuthGlobal";

const Stack = createStackNavigator();

const AdminCartBlocked = () => (
    <View style={styles.center}>
        <Text style={styles.title}>Customer-only page</Text>
        <Text style={styles.subtitle}>Admins cannot access cart or checkout.</Text>
    </View>
);

function MyStack() {
    return (
        <Stack.Navigator>
            <Stack.Screen name="Cart" component={Cart} options={{ headerShown: false }} />
            <Stack.Screen name="Checkout" component={CheckoutNavigator} options={{ title: "Checkout" }} />
        </Stack.Navigator>
    );
}

export default function CartNavigator() {
    const context = useContext(AuthGlobal);
    const isAdmin = context?.stateUser?.user?.isAdmin === true;

    if (isAdmin) {
        return (
            <Stack.Navigator>
                <Stack.Screen name="Cart Blocked" component={AdminCartBlocked} options={{ headerShown: false }} />
            </Stack.Navigator>
        );
    }

    return <MyStack />;
}

const styles = StyleSheet.create({
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f5f5f5",
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
        color: "#111",
    },
    subtitle: {
        marginTop: 8,
        color: "#555",
        textAlign: "center",
    },
});
