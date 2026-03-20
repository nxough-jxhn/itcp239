import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import Login from "../Screens/User/Login";
import Register from "../Screens/User/Register";
import UserProfile from "../Screens/User/UserProfile";
import MyOrders from "../Screens/User/MyOrders";
import NotificationCenter from "../Screens/User/NotificationCenter";
import OrderDetails from "../Screens/User/OrderDetails";
import NotificationDetail from "../Screens/User/NotificationDetail";
import Wishlist from "../Screens/User/Wishlist";

const Stack = createStackNavigator();

const UserNavigator = () => {
    return (
        <Stack.Navigator initialRouteName="User Profile">
            <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={Register} options={{ headerShown: false }} />
            <Stack.Screen name="User Profile" component={UserProfile} options={{ headerShown: false }} />
            <Stack.Screen name="My Orders" component={MyOrders} options={{ headerShown: false }} />
            <Stack.Screen name="Wishlist" component={Wishlist} options={{ headerShown: false }} />
            <Stack.Screen name="Order Details" component={OrderDetails} options={{ headerShown: false }} />
            <Stack.Screen name="Notifications" component={NotificationCenter} options={{ headerShown: false }} />
            <Stack.Screen name="Notification Detail" component={NotificationDetail} options={{ headerShown: false }} />
        </Stack.Navigator>
    );
};

export default UserNavigator;
