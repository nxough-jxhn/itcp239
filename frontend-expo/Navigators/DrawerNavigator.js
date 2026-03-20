import * as React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import Main from "./Main";
import DrawerContent from "../Shared/DrawerContent";

const NativeDrawer = createDrawerNavigator();

const DrawerNavigator = () => {
    return (
        <NativeDrawer.Navigator
            screenOptions={{
                drawerStyle: { width: "70%", backgroundColor: "#fff", borderRightWidth: 1, borderRightColor: "#eaeaea" },
                headerShown: false,          // hide default header
            }}
            drawerContent={(props) => <DrawerContent {...props} />}
        >
            <NativeDrawer.Screen name="PeakPlay" component={Main} />
        </NativeDrawer.Navigator>
    );
};

export default DrawerNavigator;
