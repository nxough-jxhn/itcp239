import React, { useContext } from "react";
import { View, Text, StyleSheet } from "react-native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import Checkout from "../Screens/Checkout/Checkout";
import Payment from "../Screens/Checkout/Payment";
import Confirm from "../Screens/Checkout/Confirm";
import AuthGlobal from "../Context/Store/AuthGlobal";

const Tab = createMaterialTopTabNavigator();

const AdminCheckoutBlocked = () => (
    <View style={styles.center}>
        <Text style={styles.title}>Customer-only page</Text>
        <Text style={styles.subtitle}>Admins cannot access checkout flow.</Text>
    </View>
);

function MyTabs() {
    return (
        <Tab.Navigator
            screenOptions={{
                tabBarActiveTintColor: "#111",
                tabBarInactiveTintColor: "#8d8d8d",
                tabBarIndicatorStyle: {
                    backgroundColor: "#111",
                    height: 3,
                    borderRadius: 2,
                },
                tabBarLabelStyle: {
                    fontWeight: "700",
                    textTransform: "none",
                    fontSize: 13,
                },
                tabBarStyle: {
                    backgroundColor: "#fff",
                    borderBottomWidth: 1,
                    borderBottomColor: "#ececec",
                    elevation: 0,
                    shadowOpacity: 0,
                },
                tabBarPressColor: "transparent",
            }}
        >
            <Tab.Screen name="Shipping" component={Checkout} />
            <Tab.Screen name="Payment" component={Payment} />
            <Tab.Screen name="Confirm" component={Confirm} />
        </Tab.Navigator>
    );
}

export default function CheckoutNavigator() {
    const context = useContext(AuthGlobal);
    const isAdmin = context?.stateUser?.user?.isAdmin === true;

    if (isAdmin) {
        return <AdminCheckoutBlocked />;
    }

    return <MyTabs />;
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
