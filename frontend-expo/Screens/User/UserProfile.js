import React, { useContext, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, RefreshControl } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import mime from "mime";
import baseURL from "../../assets/common/baseurl";
import AuthGlobal from "../../Context/Store/AuthGlobal";
import { logoutUser } from "../../Context/Actions/Auth.actions";
import Input from "../../Shared/Input";
import Toast from "react-native-toast-message";
import AddressMapPicker from "../../Shared/AddressMapPicker";
import { getJwtToken } from "../../assets/common/authToken";
import AppPageHeader from "../../Shared/AppPageHeader";

const REQUEST_TIMEOUT_MS = 8000;

const friendlyFieldName = {
    phone: "Phone",
    deliveryAddress1: "Address Line 1",
    deliveryCity: "City",
    deliveryZip: "Zip",
    deliveryCountry: "Country",
};

const UserProfile = () => {
    const context = useContext(AuthGlobal);
    const [userProfile, setUserProfile] = useState("");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [deliveryAddress1, setDeliveryAddress1] = useState("");
    const [deliveryAddress2, setDeliveryAddress2] = useState("");
    const [deliveryCity, setDeliveryCity] = useState("");
    const [deliveryZip, setDeliveryZip] = useState("");
    const [deliveryCountry, setDeliveryCountry] = useState("Philippines");
    const [deliveryLocation, setDeliveryLocation] = useState(null);
    const [profileImage, setProfileImage] = useState("");
    const [newProfileImage, setNewProfileImage] = useState("");
    const [mapVisible, setMapVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const navigation = useNavigation();

    const requiredProfileFields = {
        phone: String(phone || "").trim(),
        deliveryAddress1: String(deliveryAddress1 || "").trim(),
        deliveryCity: String(deliveryCity || "").trim(),
        deliveryZip: String(deliveryZip || "").trim(),
        deliveryCountry: String(deliveryCountry || "").trim(),
    };
    const missingRequiredFields = Object.entries(requiredProfileFields)
        .filter(([, value]) => !value)
        .map(([key]) => key);
    const isCheckoutReady = missingRequiredFields.length === 0;

    const hydrateProfileForm = (profile) => {
        setUserProfile(profile);
        setName(profile?.name || "");
        setPhone(profile?.phone || "");
        setDeliveryAddress1(profile?.deliveryAddress1 || "");
        setDeliveryAddress2(profile?.deliveryAddress2 || "");
        setDeliveryCity(profile?.deliveryCity || "");
        setDeliveryZip(profile?.deliveryZip || "");
        setDeliveryCountry(profile?.deliveryCountry || "Philippines");
        setProfileImage(profile?.image || "");
        setNewProfileImage("");
        if (
            Number.isFinite(profile?.deliveryLocation?.latitude)
            && Number.isFinite(profile?.deliveryLocation?.longitude)
        ) {
            setDeliveryLocation({
                latitude: Number(profile.deliveryLocation.latitude),
                longitude: Number(profile.deliveryLocation.longitude),
            });
        } else {
            setDeliveryLocation(null);
        }
    };

    const loadProfile = useCallback(async () => {
        if (
            context.stateUser.isAuthenticated === false ||
            context.stateUser.isAuthenticated === null
        ) {
            navigation.navigate("User", { screen: "Login" });
            return;
        }

        try {
            setRefreshing(true);
            const token = await getJwtToken();
            const user = await axios.get(`${baseURL}users/${context.stateUser.user.userId}`, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: REQUEST_TIMEOUT_MS,
            });
            hydrateProfileForm(user.data);
        } catch (_error) {
            Toast.show({
                topOffset: 60,
                type: "error",
                text1: "Unable to load profile",
                text2: "Backend might be unavailable",
            });
        } finally {
            setRefreshing(false);
        }
    }, [context.stateUser.isAuthenticated, context.stateUser?.user?.userId, navigation]);

    useFocusEffect(
        useCallback(() => {
            loadProfile();
            return () => setUserProfile("");
        }, [loadProfile])
    );

    const onMapPicked = (picked) => {
        setMapVisible(false);
        setDeliveryLocation(picked.coordinate);
        setDeliveryAddress1(picked.address1 || "");
        setDeliveryCity(picked.city || "");
        setDeliveryZip(picked.zip || "");
        setDeliveryCountry(picked.country || "Philippines");
        Toast.show({
            topOffset: 60,
            type: "success",
            text1: "Location selected",
            text2: "Review details, then tap Save Profile",
        });
    };

    const pickProfileFromGallery = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.9,
        });
        if (!result.canceled) {
            const uri = result.assets[0].uri;
            setNewProfileImage(uri);
            setProfileImage(uri);
        }
    };

    const takeProfilePhoto = async () => {
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.9,
        });
        if (!result.canceled) {
            const uri = result.assets[0].uri;
            setNewProfileImage(uri);
            setProfileImage(uri);
        }
    };

    const uploadProfilePhoto = async (jwt) => {
        if (!newProfileImage) return null;

        const fileUri = newProfileImage.startsWith("file://") ? newProfileImage : `file://${newProfileImage}`;
        const formData = new FormData();
        formData.append("image", {
            uri: fileUri,
            type: mime.getType(fileUri) || "image/jpeg",
            name: fileUri.split("/").pop() || `profile-${Date.now()}.jpg`,
        });

        const response = await axios.put(`${baseURL}users/profile/image`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
                Authorization: `Bearer ${jwt}`,
            },
            timeout: REQUEST_TIMEOUT_MS,
        });

        setNewProfileImage("");
        return response.data;
    };

    const saveProfile = async () => {
        try {
            setIsSaving(true);
            const jwt = await getJwtToken();
            if (!jwt) {
                Toast.show({ topOffset: 60, type: "error", text1: "Session expired", text2: "Please login again" });
                return;
            }

            await uploadProfilePhoto(jwt);

            const payload = {
                name,
                phone,
                deliveryAddress1,
                deliveryAddress2,
                deliveryCity,
                deliveryZip,
                deliveryCountry,
                ...(deliveryLocation ? { deliveryLocation } : {}),
            };

            const response = await axios.put(`${baseURL}users/profile`, payload, {
                headers: { Authorization: `Bearer ${jwt}` },
                timeout: REQUEST_TIMEOUT_MS,
            });

            hydrateProfileForm(response.data);
            Toast.show({ topOffset: 60, type: "success", text1: "Profile updated" });
        } catch (_error) {
            Toast.show({ topOffset: 60, type: "error", text1: "Failed to save profile" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            <AppPageHeader />
            <ScrollView
                contentContainerStyle={styles.subContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadProfile} />}
            >
                <View style={styles.heroCard}>
                    <View style={styles.avatarWrap}>
                        <Image
                            source={{
                                uri:
                                    profileImage
                                    || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png",
                            }}
                            style={styles.avatar}
                        />
                    </View>

                    <Text style={styles.nameTitle}>{userProfile ? userProfile.name : "Your Profile"}</Text>
                    <Text style={styles.emailText}>{userProfile ? userProfile.email : ""}</Text>

                    <View style={styles.heroBadgesRow}>
                        {userProfile && userProfile.isAdmin ? (
                            <View style={styles.adminBadge}>
                                <Text style={styles.adminBadgeText}>ADMIN</Text>
                            </View>
                        ) : null}
                        <View style={[styles.completionBadge, isCheckoutReady ? styles.completeBadge : styles.incompleteBadge]}>
                            <Text style={styles.completionBadgeText}>
                                {isCheckoutReady ? "Checkout Ready" : "Profile Incomplete"}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.imageButtonsRow}>
                        <TouchableOpacity style={styles.imageBtn} onPress={pickProfileFromGallery}>
                            <Text style={styles.imageBtnText}>Gallery</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.imageBtn} onPress={takeProfilePhoto}>
                            <Text style={styles.imageBtnText}>Camera</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {!isCheckoutReady ? (
                    <Text style={styles.missingFieldsText}>
                        Missing: {missingRequiredFields.map((key) => friendlyFieldName[key] || key).join(", ")}
                    </Text>
                ) : null}

                <View style={styles.sectionCard}>
                    <Text style={styles.sectionHeader}>Personal Information</Text>
                    <Input label="Name" placeholder="Your name" value={name} onChangeText={setName} />
                    <Input
                        label="Phone"
                        placeholder="Your phone number"
                        value={phone}
                        keyboardType="numeric"
                        onChangeText={(value) => setPhone(String(value || "").replace(/\D/g, ""))}
                    />
                </View>

                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionHeader}>Delivery Address</Text>
                        <TouchableOpacity style={styles.mapButton} onPress={() => setMapVisible(true)}>
                            <Text style={styles.mapButtonText}>Set from Map</Text>
                        </TouchableOpacity>
                    </View>

                    <Input label="Address Line 1" placeholder="Street, building, etc." value={deliveryAddress1} onChangeText={setDeliveryAddress1} />
                    <Input label="Address Line 2 (optional)" placeholder="Unit, floor, etc." value={deliveryAddress2} onChangeText={setDeliveryAddress2} />
                    <Input label="City" placeholder="City or municipality" value={deliveryCity} onChangeText={setDeliveryCity} />
                    <Input label="Zip Code" placeholder="Postal/Zip code" value={deliveryZip} keyboardType="numeric" onChangeText={(value) => setDeliveryZip(String(value || "").replace(/\D/g, ""))} />
                    <Input label="Country" placeholder="Country" value={deliveryCountry} onChangeText={setDeliveryCountry} />
                    <View style={styles.formActionsWrap}>
                        <TouchableOpacity
                            style={[styles.formActionBtn, isSaving && styles.formActionBtnDisabled]}
                            onPress={saveProfile}
                            disabled={isSaving}
                        >
                            <Text style={styles.formActionText}>{isSaving ? "Saving..." : "Save Profile"}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.formActionBtn}
                            onPress={() => {
                                logoutUser(context.dispatch);
                            }}
                        >
                            <Text style={styles.formActionText}>Sign Out</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.bottomSpace} />
            </ScrollView>
            <AddressMapPicker
                visible={mapVisible}
                initialLocation={deliveryLocation}
                onClose={() => setMapVisible(false)}
                onPicked={onMapPicked}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f7f7f7",
    },
    subContainer: {
        paddingTop: 12,
        paddingBottom: 24,
        paddingHorizontal: 14,
    },
    heroCard: {
        backgroundColor: "#fff",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#ececec",
        padding: 16,
        alignItems: "center",
        marginBottom: 12,
    },
    avatarWrap: {
        width: 104,
        height: 104,
        borderRadius: 52,
        borderWidth: 2,
        borderColor: "#111",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    nameTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1a1a1a",
    },
    heroBadgesRow: {
        flexDirection: "row",
        marginTop: 10,
        gap: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    adminBadge: {
        backgroundColor: "#111",
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 5,
    },
    adminBadgeText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 12,
        letterSpacing: 1,
    },
    mapButton: {
        backgroundColor: "#111",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    mapButtonText: {
        color: "white",
        fontWeight: "600",
        fontSize: 12,
    },
    completionBadge: {
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 5,
    },
    completeBadge: {
        backgroundColor: "#1f7a3d",
    },
    incompleteBadge: {
        backgroundColor: "#8b1e24",
    },
    completionBadgeText: {
        color: "white",
        fontWeight: "700",
        letterSpacing: 0.2,
        fontSize: 12,
    },
    missingFieldsText: {
        marginTop: 2,
        marginBottom: 10,
        color: "#b71c1c",
        fontSize: 12,
        marginHorizontal: 8,
        textAlign: "center",
    },
    sectionCard: {
        backgroundColor: "#fff",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#ececec",
        padding: 14,
        marginBottom: 12,
    },
    sectionHeader: {
        fontSize: 17,
        fontWeight: "700",
        color: "#222",
        marginBottom: 10,
    },
    sectionHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 2,
    },
    emailText: {
        fontSize: 14,
        color: "#555",
        marginTop: 3,
        marginBottom: 4,
    },
    avatar: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: "#ddd",
    },
    imageButtonsRow: {
        flexDirection: "row",
        gap: 10,
        marginTop: 10,
    },
    imageBtn: {
        backgroundColor: "#111",
        borderRadius: 8,
        paddingVertical: 7,
        paddingHorizontal: 12,
    },
    imageBtnText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 12,
    },
    formActionsWrap: {
        marginTop: 14,
        gap: 10,
        paddingTop: 4,
    },
    formActionBtn: {
        backgroundColor: "#111",
        minHeight: 48,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 12,
    },
    formActionBtnDisabled: {
        opacity: 0.75,
    },
    formActionText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 15,
    },
    bottomSpace: {
        height: 8,
    },
});

export default UserProfile;
