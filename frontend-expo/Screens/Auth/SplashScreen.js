/**
 * Splash screen: PeakPlay logo on white. Shown when app opens.
 * Flow: open app -> splash logo -> onboarding or login
 */
import React, { useEffect } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { APP_LOGO, APP_NAME } from "../../assets/common/branding";

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
                <Image source={APP_LOGO} style={styles.logoImage} resizeMode="contain" />
            </View>
            <Text style={styles.brandName}>{APP_NAME}</Text>
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
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#e8e8e8",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    logoImage: {
        width: 52,
        height: 52,
    },
    brandName: {
        fontSize: 24,
        fontWeight: "700",
        color: "#000",
    },
});

export default SplashScreen;
