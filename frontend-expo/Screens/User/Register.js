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

    const isValidEmail = (value) => /^\S+@\S+\.\S+$/.test(String(value || "").trim());
    const sanitizePhone = (value) => String(value || "").replace(/\D/g, "");
    const isValidPhone = (value) => /^\d{10,15}$/.test(String(value || ""));

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
            >
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>
                    Shop the best products. Create an account to get started.
                </Text>

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

                <View style={styles.form}>
                    <Input
                        placeholder="Username"
                        value={name}
                        onChangeText={setName}
                    />
                    <Input
                        placeholder="Email"
                        value={email}
                        onChangeText={(t) => setEmail(t.toLowerCase())}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                    <Input
                        placeholder="Phone"
                        value={phone}
                        onChangeText={(value) => setPhone(sanitizePhone(value))}
                        keyboardType="phone-pad"
                        maxLength={15}
                    />
                    <Input
                        placeholder="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        showToggle
                    />
                    <Input
                        placeholder="Confirm Password"
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
                <SocialLoginButtons
                    dispatch={context.dispatch}
                    variant="outline"
                />

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Already have an account?{" "}
                    </Text>
                    <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                        <Text style={styles.signInLink}>Sign In</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    scroll: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 48,
        paddingBottom: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        color: "#000",
        marginBottom: 12,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 15,
        color: "#666",
        textAlign: "center",
        marginBottom: 28,
    },
    form: {
        marginBottom: 24,
        width: "100%",
        maxWidth: 420,
        alignSelf: "center",
    },
    imagePickerWrap: {
        alignItems: "center",
        marginBottom: 18,
    },
    avatar: {
        width: 84,
        height: 84,
        borderRadius: 42,
        backgroundColor: "#ddd",
        marginBottom: 10,
    },
    imageButtonsRow: {
        flexDirection: "row",
        gap: 10,
    },
    imageBtn: {
        backgroundColor: "#111",
        borderRadius: 8,
        paddingVertical: 7,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    imageBtnText: {
        color: "#fff",
        fontWeight: "600",
    },
    errorText: {
        color: "#d32f2f",
        marginBottom: 12,
        fontWeight: "600",
    },
    loader: { marginVertical: 12 },
    primaryBtn: {
        height: 48,
        backgroundColor: "#000",
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 8,
    },
    primaryBtnText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "600",
    },
    divider: {
        textAlign: "center",
        color: "#999",
        fontSize: 14,
        marginBottom: 16,
    },
    footer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 24,
    },
    footerText: { fontSize: 15, color: "#666" },
    signInLink: { fontSize: 15, color: "#000", fontWeight: "700" },
});

export default Register;
