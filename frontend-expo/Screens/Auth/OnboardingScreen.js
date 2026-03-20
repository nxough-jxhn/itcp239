/**
 * Onboarding: 3 intro slides before login/signup.
 * Flow: Skip or Get Started -> mark seen -> go to Login
 */
import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import Swiper from "react-native-swiper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");
const ONBOARDING_KEY = "hasSeenOnboarding";

const slides = [
    {
        icon: "walk-outline",
        title: "Gear Up\nFor Every Game",
        subtitle: "Find balls, rackets, gloves and more\nfor your favorite sports.",
    },
    {
        icon: "fitness-outline",
        title: "Peak Performance\nStarts Here",
        subtitle: "Quality sport tools that help you\ntrain smarter and play better.",
    },
    {
        icon: "trophy-outline",
        title: "Play To Win\nWith PeakPlay",
        subtitle: "Set up your gear now and\nstart your journey to victory.",
        isLast: true,
    },
];


const OnboardingScreen = ({ navigation }) => {
    const [index, setIndex] = useState(0);
    const swiperRef = useRef(null);

    const markSeenAndGoToLogin = async () => {
        await AsyncStorage.setItem(ONBOARDING_KEY, "true");
        navigation.replace("Login");
    };

    const handlePrimaryPress = () => {
        if (index === slides.length - 1) {
            markSeenAndGoToLogin();
        } else {
            swiperRef.current?.scrollBy(1);
        }
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.skipBtn}
                onPress={markSeenAndGoToLogin}
            >
                <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>

            <Swiper
                ref={swiperRef}
                loop={false}
                onIndexChanged={setIndex}
                dotStyle={styles.dot}
                activeDotStyle={styles.activeDot}
                paginationStyle={styles.pagination}
            >
                {slides.map((slide, i) => (
                    <View key={i} style={styles.slide}>
                        <View style={styles.iconWrap}>
                            <Ionicons
                                name={slide.icon}
                                size={66}
                                color="#333"
                            />
                        </View>
                        {slide.title ? (
                            <Text style={styles.title}>{slide.title}</Text>
                        ) : null}
                        {slide.subtitle ? (
                            <Text style={styles.subtitle}>{slide.subtitle}</Text>
                        ) : null}
                    </View>
                ))}
            </Swiper>

            <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handlePrimaryPress}
            >
                <Text style={styles.primaryBtnText}>
                    {index === slides.length - 1 ? "Get Started" : "Next"}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    skipBtn: {
        position: "absolute",
        top: 56,
        right: 20,
        zIndex: 10,
    },
    skipText: { fontSize: 14, color: "#666", fontWeight: "600" },
    slide: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
    },
    iconWrap: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: "#f5f5f5",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 24,
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        color: "#000",
        textAlign: "center",
        lineHeight: 30,
    },
    subtitle: {
        fontSize: 15,
        color: "#888",
        textAlign: "center",
        marginTop: 12,
        lineHeight: 22,
    },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ccc" },
    activeDot: { width: 24, height: 8, borderRadius: 4, backgroundColor: "#000" },
    pagination: { bottom: 100 },
    primaryBtn: {
        position: "absolute",
        bottom: 50,
        left: 24,
        right: 24,
        height: 48,
        backgroundColor: "#000",
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    primaryBtnText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "600",
    },
});

export default OnboardingScreen;
