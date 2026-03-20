/**
 * Splash screen: SnapShop logo on white. Shown when app opens.
 * Flow: open app -> splash logo -> onboarding or login
 */
import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_KEY = "hasSeenOnboarding";

const SplashScreen = ({ navigation }) => {
    useEffect(() => {
        const run = async () => {
            await new Promise((r) => setTimeout(r, 2500));
            const seen = await AsyncStorage.getItem(ONBOARDING_KEY);
            navigation.replace(seen === "true" ? "Login" : "Onboarding");
        };
        run();
    }, [navigation]);

    return (
        <View style={styles.container}>
            <View style={styles.logoBox}>
                <Ionicons name="bag-handle-outline" size={48} color="#fff" />
            </View>
            <Text style={styles.brandName}>SnapShop</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
    },
    logoBox: {
        width: 76,
        height: 76,
        borderRadius: 20,
        backgroundColor: "#000",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    brandName: {
        fontSize: 24,
        fontWeight: "700",
        color: "#000",
    },
});

export default SplashScreen;
