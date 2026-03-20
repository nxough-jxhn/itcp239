import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import ProductContainer from "../Screens/Product/ProductContainer";
import SingleProduct from "../Screens/Product/SingleProduct";
import LeaveReview from "../Screens/Product/LeaveReview";
import CatalogSearch from "../Screens/Product/CatalogSearch";

const Stack = createStackNavigator();

function MyStack() {
    return (
        <Stack.Navigator>
            <Stack.Screen
                name="Main"
                component={ProductContainer}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Product Detail"
                component={SingleProduct}
                options={{ headerShown: true }}
            />
            <Stack.Screen
                name="Catalog Search"
                component={CatalogSearch}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Leave Review"
                component={LeaveReview}
                options={{ headerShown: true, title: "Leave a Review" }}
            />
        </Stack.Navigator>
    );
}

export default function HomeNavigator() {
    return <MyStack />;
}
