/**
 * Register screen: Create Account design. Connects to backend users/register
 */
import React, { useState, useContext } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Image,
    Animated,
    RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import mime from "mime";
import Input from "../../Shared/Input";
import SocialLoginButtons from "../../Shared/SocialLoginButtons";
import AuthGlobal from "../../Context/Store/AuthGlobal";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import Toast from "react-native-toast-message";
import { APP_LOGO, APP_NAME, APP_TAGLINE } from "../../assets/common/branding";

const Register = () => {
    const context = useContext(AuthGlobal);
    const navigation = useNavigation();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [image, setImage] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const fadeAnim = useState(new Animated.Value(0))[0];
    const riseAnim = useState(new Animated.Value(14))[0];

    React.useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 420,
                useNativeDriver: true,
            }),
            Animated.timing(riseAnim, {
                toValue: 0,
                duration: 420,
                useNativeDriver: true,
            }),
        ]).start();
    }, [fadeAnim, riseAnim]);

    const isValidEmail = (value) => /^\S+@\S+\.\S+$/.test(String(value || "").trim());
    const sanitizePhone = (value) => String(value || "").replace(/\D/g, "");
    const isValidPhone = (value) => /^\d{10,15}$/.test(String(value || ""));

    const replayEntryAnimation = () => {
        fadeAnim.setValue(0);
        riseAnim.setValue(14);
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 380,
                useNativeDriver: true,
            }),
            Animated.timing(riseAnim, {
                toValue: 0,
                duration: 380,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const resetForm = () => {
        setName("");
        setEmail("");
        setPhone("");
        setPassword("");
        setConfirmPassword("");
        setImage("");
        setError("");
    };

    const onRefresh = async () => {
        setRefreshing(true);
        resetForm();
        replayEntryAnimation();
        setTimeout(() => setRefreshing(false), 350);
    };

    const pickFromGallery = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.9,
        });
        if (!result.canceled) setImage(result.assets[0].uri);
    };

    const takePhoto = async () => {
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.9,
        });
        if (!result.canceled) setImage(result.assets[0].uri);
    };

    const register = () => {
        if (
            !name.trim() ||
            !email.trim() ||
            !phone.trim() ||
            !password ||
            !confirmPassword
        ) {
            setError("Please fill in all fields");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }
        if (name.trim().length < 2) {
            setError("Name must be at least 2 characters");
            return;
        }
        if (!isValidEmail(email)) {
            setError("Please enter a valid email address");
            return;
        }
        if (!isValidPhone(phone)) {
            setError("Phone number must contain 10 to 15 digits");
            return;
        }
        setError("");
        setIsSubmitting(true);

        const formData = new FormData();
        formData.append("name", name.trim());
        formData.append("email", email.trim().toLowerCase());
        formData.append("password", password);
        formData.append("phone", phone.trim());
        formData.append("isAdmin", "false");

        if (image) {
            const fileUri = image.startsWith("file://") ? image : `file://${image}`;
            formData.append("image", {
                uri: fileUri,
                type: mime.getType(fileUri) || "image/jpeg",
                name: fileUri.split("/").pop() || `user-${Date.now()}.jpg`,
            });
        }

        const config = { headers: { "Content-Type": "multipart/form-data" } };

        axios
            .post(`${baseURL}users/register`, formData, config)
            .then(() => {
                Toast.show({
                    topOffset: 60,
                    type: "success",
                    text1: "Registration Succeeded",
                    text2: "Please sign in to your account",
                });
                navigation.navigate("Login");
            })
            .catch((err) => {
                const msg =
                    err.response?.data?.message || "Something went wrong";
                setError(msg);
                Toast.show({
                    type: "error",
                    text1: "Registration failed",
                    text2: msg,
                });
            })
            .finally(() => setIsSubmitting(false));
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#111" />}
            >
                <Animated.View style={[styles.page, { opacity: fadeAnim, transform: [{ translateY: riseAnim }] }]}>
                <View style={styles.headerShell}>
                    <View style={styles.brandCard}>
                        <View style={styles.brandRow}>
                            <View style={styles.brandLogoWrap}>
                                <Image source={APP_LOGO} style={styles.brandLogoImage} resizeMode="contain" />
                            </View>
                            <View>
                                <Text style={styles.brandName}>{APP_NAME}</Text>
                                <Text style={styles.brandTagline}>{APP_TAGLINE}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.titlePlate}>
                    <Text style={styles.title}>Sign Up</Text>
                </View>
                <Text style={styles.titleHint}>Create your account using email or Google account.</Text>

                <View style={styles.imageCard}>
                    <Text style={styles.sectionTitle}>Profile Photo:</Text>
                    <View style={styles.imagePickerWrap}>
                    <Image
                        source={{ uri: image || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png" }}
                        style={styles.avatar}
                    />
                    <View style={styles.imageButtonsRow}>
                        <TouchableOpacity style={styles.imageBtn} onPress={pickFromGallery}>
                            <Ionicons name="images-outline" size={16} color="#fff" />
                            <Text style={styles.imageBtnText}>Gallery</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.imageBtn} onPress={takePhoto}>
                            <Ionicons name="camera-outline" size={16} color="#fff" />
                            <Text style={styles.imageBtnText}>Camera</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                </View>

                <View style={styles.formCard}>
                    <Input
                        label="Username:"
                        placeholder="Enter name here..."
                        value={name}
                        onChangeText={setName}
                    />
                    <Input
                        label="Email:"
                        placeholder="johndoe@gmail.com"
                        value={email}
                        onChangeText={(t) => setEmail(t.toLowerCase())}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                    <Input
                        label="Phone:"
                        placeholder="09XXXXXXXXX"
                        value={phone}
                        onChangeText={(value) => setPhone(sanitizePhone(value))}
                        keyboardType="phone-pad"
                        maxLength={15}
                    />
                    <Input
                        label="Password:"
                        placeholder="Enter password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        showToggle
                    />
                    <Input
                        label="Confirm Password:"
                        placeholder="Retype password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        showToggle
                    />

                    {error ? (
                        <Text style={styles.errorText}>{error}</Text>
                    ) : null}
                    {isSubmitting ? (
                        <ActivityIndicator
                            size="small"
                            color="#000"
                            style={styles.loader}
                        />
                    ) : null}

                    <TouchableOpacity
                        style={styles.primaryBtn}
                        onPress={register}
                        disabled={isSubmitting}
                    >
                        <Text style={styles.primaryBtnText}>Sign Up</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.divider}>Or continue with</Text>

                <View style={styles.socialCard}>
                    <SocialLoginButtons
                        dispatch={context.dispatch}
                        variant="outline"
                        shortLabel
                    />
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Already have an account?{" "}
                    </Text>
                    <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                        <Text style={styles.signInLink}>Sign In</Text>
                    </TouchableOpacity>
                </View>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#efefef" },
    scroll: {
        flexGrow: 1,
        paddingHorizontal: 0,
        paddingTop: 0,
        paddingBottom: 24,
    },
    page: {
        width: "100%",
    },
    headerShell: {
        position: "relative",
        marginBottom: 14,
    },
    brandCard: {
        backgroundColor: "#1a1a1a",
        borderRadius: 0,
        paddingTop: 34,
        paddingBottom: 22,
        paddingHorizontal: 20,
        alignItems: "flex-start",
    },
    brandRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
    },
    brandLogoWrap: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: "#f2f2f2",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 8,
        borderWidth: 1,
        borderColor: "#d5d5d5",
    },
    brandLogoImage: {
        width: 26,
        height: 26,
    },
    brandName: {
        fontSize: 32,
        fontWeight: "700",
        color: "#fff",
        marginBottom: 0,
        fontFamily: "serif",
    },
    brandTagline: {
        fontSize: 18,
        color: "#d5d5d5",
        opacity: 0.95,
        fontFamily: "serif",
    },
    titlePlate: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 0,
        marginBottom: 12,
        marginTop: 8,
    },
    title: {
        fontSize: 40,
        fontWeight: "700",
        color: "#111",
        letterSpacing: 0.4,
        fontFamily: "serif",
    },
    titleHint: {
        fontSize: 12,
        textAlign: "center",
        color: "#111",
        opacity: 0.56,
        marginTop: -4,
        marginBottom: 10,
    },
    imageCard: {
        paddingHorizontal: 12,
        marginBottom: 10,
    },
    formCard: {
        paddingHorizontal: 14,
        paddingTop: 8,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: "700",
        color: "#1d1d1d",
        marginBottom: 8,
    },
    imagePickerWrap: {
        alignItems: "center",
        marginBottom: 2,
    },
    avatar: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: "#ddd",
        marginBottom: 10,
        borderWidth: 2,
        borderColor: "#111",
    },
    imageButtonsRow: {
        flexDirection: "row",
        gap: 10,
    },
    imageBtn: {
        backgroundColor: "#111",
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 11,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    imageBtnText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 12,
    },
    errorText: {
        color: "#d32f2f",
        marginBottom: 12,
        fontWeight: "600",
        fontSize: 12,
    },
    loader: { marginVertical: 12 },
    primaryBtn: {
        height: 46,
        backgroundColor: "#000",
        borderRadius: 11,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 6,
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
    },
    primaryBtnText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
    divider: {
        textAlign: "center",
        color: "#555",
        fontSize: 12,
        marginBottom: 10,
        marginTop: 2,
        textTransform: "none",
    },
    socialCard: {
        paddingVertical: 2,
        paddingHorizontal: 10,
    },
    footer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 12,
        marginBottom: 12,
    },
    footerText: { fontSize: 13, color: "#555" },
    signInLink: { fontSize: 13, color: "#111", fontWeight: "700" },
});

export default Register;
