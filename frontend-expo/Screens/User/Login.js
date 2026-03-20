/**
 * Login screen: Welcome Back design. Email/password + social (Google).
 * Connected to backend users/login and users/auth/google
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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AuthGlobal from "../../Context/Store/AuthGlobal";
import { loginUser } from "../../Context/Actions/Auth.actions";
import Input from "../../Shared/Input";
import SocialLoginButtons from "../../Shared/SocialLoginButtons";

const Login = () => {
    const context = useContext(AuthGlobal);
    const navigation = useNavigation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isValidEmail = (value) => /^\S+@\S+\.\S+$/.test(String(value || "").trim());

    const handleSubmit = () => {
        if (email === "" || password === "") {
            setError("Please fill in your credentials");
            return;
        }
        if (!isValidEmail(email)) {
            setError("Please enter a valid email address");
            return;
        }
        setError("");
        setIsSubmitting(true);
        loginUser({ email, password }, context.dispatch).finally(() =>
            setIsSubmitting(false)
        );
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
                <View style={styles.logoBox}>
                    <Ionicons name="bag-handle-outline" size={44} color="#fff" />
                </View>
                <Text style={styles.brandName}>PeakPlay</Text>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>
                Log in to your PeakPlay account using email or social networks
                </Text>

                <SocialLoginButtons
                    dispatch={context.dispatch}
                    variant="outline"
                />

                <Text style={styles.divider}>Or continue with social account</Text>

                <View style={styles.form}>
                    <Input
                        placeholder="Email"
                        value={email}
                        onChangeText={(t) => setEmail(t.toLowerCase())}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                    <Input
                        placeholder="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        showToggle
                    />
                    <TouchableOpacity style={styles.forgetLink}>
                        <Text style={styles.forgetText}>Forget Password?</Text>
                    </TouchableOpacity>

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
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        <Text style={styles.primaryBtnText}>Sign In</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Didn&apos;t have an account?{" "}
                    </Text>
                    <TouchableOpacity
                        onPress={() => navigation.navigate("Register")}
                    >
                        <Text style={styles.registerLink}>Register</Text>
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
    logoBox: {
        width: 64,
        height: 64,
        borderRadius: 16,
        backgroundColor: "#000",
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "center",
        marginBottom: 12,
    },
    brandName: {
        fontSize: 21,
        fontWeight: "700",
        color: "#000",
        textAlign: "center",
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        color: "#000",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: "#666",
        marginBottom: 24,
    },
    divider: {
        textAlign: "center",
        color: "#999",
        fontSize: 14,
        marginVertical: 20,
    },
    form: {
        marginTop: 8,
        width: "100%",
        maxWidth: 420,
        alignSelf: "center",
    },
    forgetLink: { alignSelf: "flex-end", marginBottom: 16 },
    forgetText: { fontSize: 14, color: "#000", fontWeight: "600" },
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
    footer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 32,
    },
    footerText: { fontSize: 15, color: "#666" },
    registerLink: { fontSize: 15, color: "#000", fontWeight: "700" },
});

export default Login;
