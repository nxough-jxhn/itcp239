import React, { useContext } from "react";
import { View, Text, StyleSheet } from "react-native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useSelector } from "react-redux";
import Toast from "react-native-toast-message";
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
    const cartItems = useSelector((state) => state.cartItems || []);

    const hasCartItems = Array.isArray(cartItems) && cartItems.length > 0;

    const ensureShippingFirst = (navigation) => {
        Toast.show({ topOffset: 60, type: "error", text1: "Complete Shipping first" });
        navigation.navigate("Shipping");
    };

    return (
        <Tab.Navigator
            screenOptions={{
                tabBarActiveTintColor: "#111",
                tabBarInactiveTintColor: "#8d8d8d",
                swipeEnabled: false,
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
            <Tab.Screen
                name="Payment"
                component={Payment}
                listeners={({ navigation, route }) => ({
                    tabPress: (event) => {
                        const hasOrderPayload = !!route?.params?.order?.orderItems?.length;
                        if (!hasCartItems || !hasOrderPayload) {
                            event.preventDefault();
                            ensureShippingFirst(navigation);
                        }
                    },
                })}
            />
            <Tab.Screen
                name="Confirm"
                component={Confirm}
                listeners={({ navigation, route }) => ({
                    tabPress: (event) => {
                        const hasOrderPayload = !!route?.params?.order?.orderItems?.length;
                        const hasPaymentPayload = !!route?.params?.paymentMethod;
                        if (!hasCartItems || !hasOrderPayload || !hasPaymentPayload) {
                            event.preventDefault();
                            Toast.show({ topOffset: 60, type: "error", text1: "Complete Shipping and Payment first" });
                            navigation.navigate("Shipping");
                        }
                    },
                })}
            />
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
