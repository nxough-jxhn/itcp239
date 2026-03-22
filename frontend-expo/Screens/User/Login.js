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
    Animated,
    RefreshControl,
    Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AuthGlobal from "../../Context/Store/AuthGlobal";
import { loginUser } from "../../Context/Actions/Auth.actions";
import Input from "../../Shared/Input";
import SocialLoginButtons from "../../Shared/SocialLoginButtons";
import { APP_LOGO, APP_NAME, APP_TAGLINE } from "../../assets/common/branding";

const Login = () => {
    const context = useContext(AuthGlobal);
    const navigation = useNavigation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
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
        setEmail("");
        setPassword("");
        setError("");
    };

    const onRefresh = async () => {
        setRefreshing(true);
        resetForm();
        replayEntryAnimation();
        setTimeout(() => setRefreshing(false), 350);
    };

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
                    <Text style={styles.title}>Login</Text>
                </View>
                <Text style={styles.titleHint}>Login to your account using email or Google account.</Text>

                <View style={styles.formCard}>
                    <Input
                        label="Email:"
                        placeholder="johndoe@gmail.com"
                        value={email}
                        onChangeText={(t) => setEmail(t.toLowerCase())}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                    <Input
                        label="Password:"
                        placeholder="Enter your password"
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

                <Text style={styles.divider}>or continue with</Text>

                <View style={styles.socialCard}>
                    <SocialLoginButtons
                        dispatch={context.dispatch}
                        variant="outline"
                        shortLabel
                    />
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
    titlePlate: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 0,
        marginBottom: 12,
        marginTop: 8,
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
    formCard: {
        paddingHorizontal: 14,
        paddingTop: 8,
    },
    divider: {
        textAlign: "center",
        color: "#555",
        fontSize: 12,
        marginTop: 12,
        marginBottom: 10,
        textTransform: "none",
    },
    socialCard: {
        paddingVertical: 2,
        paddingHorizontal: 10,
    },
    forgetLink: { alignSelf: "flex-end", marginBottom: 12 },
    forgetText: { fontSize: 12, color: "#222", fontWeight: "600" },
    errorText: {
        color: "#d32f2f",
        marginBottom: 12,
        fontSize: 12,
        fontWeight: "600",
    },
    loader: { marginVertical: 12 },
    primaryBtn: {
        height: 46,
        backgroundColor: "#000",
        borderRadius: 11,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 4,
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
    footer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 12,
        marginBottom: 12,
    },
    footerText: { fontSize: 13, color: "#555" },
    registerLink: { fontSize: 13, color: "#111", fontWeight: "700" },
});

export default Login;
