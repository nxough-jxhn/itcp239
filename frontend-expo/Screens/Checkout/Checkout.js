import React, { useEffect, useState, useContext } from "react";
import { Text, View, TouchableOpacity, StyleSheet } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import AuthGlobal from "../../Context/Store/AuthGlobal";
import Toast from "react-native-toast-message";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import { getJwtToken } from "../../assets/common/authToken";

const Checkout = () => {
    const [user, setUser] = useState("");
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [profileReady, setProfileReady] = useState(false);
    const [orderItems, setOrderItems] = useState([]);
    const [address, setAddress] = useState("");
    const [address2, setAddress2] = useState("");
    const [city, setCity] = useState("");
    const [zip, setZip] = useState("");
    const [country, setCountry] = useState("Philippines");
    const [phone, setPhone] = useState("");
    const navigation = useNavigation();
    const cartItems = useSelector((s) => s.cartItems);
    const context = useContext(AuthGlobal);

    const isProfileComplete = (profile) => {
        return !!(
            String(profile?.phone || "").trim()
            && String(profile?.deliveryAddress1 || "").trim()
            && String(profile?.deliveryCity || "").trim()
            && String(profile?.deliveryZip || "").trim()
            && String(profile?.deliveryCountry || "").trim()
        );
    };

    useEffect(() => {
        setOrderItems(cartItems);
        setLoadingProfile(true);

        if (!Array.isArray(cartItems) || cartItems.length === 0) {
            navigation.navigate("Cart");
            setLoadingProfile(false);
            return;
        }

        if (context.stateUser.isAuthenticated) {
            setUser(context.stateUser.user.userId);
            getJwtToken()
                .then((jwt) => {
                    if (!jwt) return;
                    return axios.get(`${baseURL}users/${context.stateUser.user.userId}`, {
                        headers: { Authorization: `Bearer ${jwt}` },
                    });
                })
                .then((response) => {
                    const profile = response?.data;
                    if (!profile) {
                        setProfileReady(false);
                        return;
                    }

                    if (profile.phone) setPhone(profile.phone);
                    if (profile.deliveryAddress1) setAddress(profile.deliveryAddress1);
                    if (profile.deliveryAddress2) setAddress2(profile.deliveryAddress2);
                    if (profile.deliveryCity) setCity(profile.deliveryCity);
                    if (profile.deliveryZip) setZip(profile.deliveryZip);
                    if (profile.deliveryCountry) setCountry(profile.deliveryCountry);

                    const complete = isProfileComplete(profile);
                    setProfileReady(complete);
                    if (!complete) {
                        Toast.show({
                            topOffset: 60,
                            type: "error",
                            text1: "Complete your profile first",
                            text2: "Add phone and delivery address in User Profile",
                        });
                    }
                })
                .catch(() => {
                    setProfileReady(false);
                })
                .finally(() => setLoadingProfile(false));
        } else {
            navigation.navigate("User", { screen: "Login" });
            Toast.show({ topOffset: 60, type: "error", text1: "Please login to checkout" });
            setLoadingProfile(false);
        }
        return () => setOrderItems([]);
    }, [cartItems, context.stateUser.isAuthenticated]);

    const checkOut = () => {
        if (loadingProfile) {
            Toast.show({ topOffset: 60, type: "info", text1: "Loading profile..." });
            return;
        }

        if (!profileReady) {
            Toast.show({
                topOffset: 60,
                type: "error",
                text1: "Profile required before checkout",
                text2: "Please complete delivery details in User Profile",
            });
            navigation.navigate("User", { screen: "User Profile" });
            return;
        }

        navigation.navigate("Payment", {
            order: {
                city,
                country,
                dateOrdered: Date.now(),
                orderItems,
                phone,
                shippingAddress1: address,
                shippingAddress2: address2,
                status: "pending",
                user,
                zip,
            },
        });
    };

    return (
        <KeyboardAwareScrollView viewIsInsideTabBar extraHeight={180} enableOnAndroid style={styles.page} contentContainerStyle={styles.content}>
            <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Address Details</Text>
                    <TouchableOpacity onPress={() => navigation.navigate("User", { screen: "User Profile" })}>
                        <Text style={styles.changeText}>Change</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Address Line 1</Text>
                    <Text style={styles.fieldValue}>{address || "Not set"}</Text>
                </View>
                {String(address2 || "").trim() ? (
                    <View style={styles.fieldRow}>
                        <Text style={styles.fieldLabel}>Address Line 2</Text>
                        <Text style={styles.fieldValue}>{address2}</Text>
                    </View>
                ) : null}
                <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>City</Text>
                    <Text style={styles.fieldValue}>{city || "Not set"}</Text>
                </View>
                <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Zip Code</Text>
                    <Text style={styles.fieldValue}>{zip || "Not set"}</Text>
                </View>
                <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Country</Text>
                    <Text style={styles.fieldValue}>{country || "Not set"}</Text>
                </View>
                <View style={styles.fieldRowLast}>
                    <Text style={styles.fieldLabel}>Phone</Text>
                    <Text style={styles.fieldValue}>{phone || "Not set"}</Text>
                </View>

                {!profileReady ? (
                    <View style={styles.warningBox}>
                        <Text style={styles.warningText}>Complete your profile details before continuing.</Text>
                    </View>
                ) : null}
            </View>

            <TouchableOpacity
                style={[styles.primaryBtn, !profileReady && styles.primaryBtnDisabled]}
                onPress={checkOut}
                disabled={!profileReady}
            >
                <Text style={styles.primaryBtnText}>{loadingProfile ? "Loading..." : "Continue to Payment"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => navigation.navigate("User", { screen: "User Profile" })}
            >
                <Text style={styles.secondaryBtnText}>Go to User Profile</Text>
            </TouchableOpacity>
        </KeyboardAwareScrollView>
    );
};

const styles = StyleSheet.create({
    page: {
        backgroundColor: "#f5f5f5",
    },
    content: {
        paddingHorizontal: 14,
        paddingTop: 8,
        paddingBottom: 26,
    },
    sectionCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#ececec",
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    sectionHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    sectionTitle: {
        color: "#333",
        fontSize: 17,
        fontWeight: "700",
    },
    changeText: {
        color: "#555",
        fontWeight: "700",
    },
    fieldRow: {
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f1f1",
    },
    fieldRowLast: {
        paddingVertical: 8,
    },
    fieldLabel: {
        color: "#8a8a8a",
        fontSize: 12,
        marginBottom: 2,
    },
    fieldValue: {
        color: "#222",
        fontWeight: "700",
        fontSize: 14,
    },
    warningBox: {
        marginTop: 8,
        backgroundColor: "#fff2f2",
        borderWidth: 1,
        borderColor: "#ffd3d3",
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    warningText: {
        color: "#ac2a2a",
        fontWeight: "600",
        fontSize: 12,
    },
    primaryBtn: {
        marginTop: 16,
        height: 50,
        borderRadius: 12,
        backgroundColor: "#0d0d0d",
        alignItems: "center",
        justifyContent: "center",
    },
    primaryBtnDisabled: {
        backgroundColor: "#9c9c9c",
    },
    primaryBtnText: {
        color: "#fff",
        fontWeight: "800",
        fontSize: 16,
    },
    secondaryBtn: {
        marginTop: 10,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#d7d7d7",
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
    },
    secondaryBtnText: {
        color: "#444",
        fontWeight: "700",
        fontSize: 14,
    },
});

export default Checkout;
