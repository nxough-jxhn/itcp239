import React, { useState } from "react";
import { TextInput, StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Shared Input component with optional label.
 * Pass `label` for a visible label above the field.
 * Pass `showToggle` along with `secureTextEntry` for password visibility toggle.
 */
const Input = (props) => {
    const [hidden, setHidden] = useState(true);
    const isPassword = props.secureTextEntry && props.showToggle;
    const { showToggle, label, placeholderTextColor, ...rest } = props;
    const effectivePlaceholderColor = placeholderTextColor || "rgba(17,17,17,0.35)";

    return (
        <View style={styles.wrapper}>
            {label ? <Text style={styles.label}>{label}</Text> : null}
            <View style={styles.inputRow}>
                <TextInput
                    style={[
                        styles.input,
                        isPassword && styles.inputWithToggle,
                        props.editable === false && styles.inputDisabled,
                    ]}
                    placeholderTextColor={effectivePlaceholderColor}
                    {...rest}
                    secureTextEntry={isPassword ? hidden : props.secureTextEntry}
                />
                {isPassword ? (
                    <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setHidden((prev) => !prev)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons
                            name={hidden ? "eye-off-outline" : "eye-outline"}
                            size={22}
                            color="#666"
                        />
                    </TouchableOpacity>
                ) : null}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        width: "100%",
        marginBottom: 14,
    },
    label: {
        fontSize: 13,
        fontWeight: "600",
        color: "#333",
        marginBottom: 5,
        marginLeft: 4,
    },
    inputRow: {
        position: "relative",
    },
    input: {
        width: "100%",
        height: 48,
        backgroundColor: "white",
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingRight: 14,
        borderWidth: 1.5,
        borderColor: "#ddd",
        fontSize: 15,
        color: "#1a1a1a",
    },
    inputWithToggle: {
        paddingRight: 48,
    },
    inputDisabled: {
        backgroundColor: "#f0f0f0",
        color: "#666",
    },
    eyeButton: {
        position: "absolute",
        right: 14,
        top: 0,
        bottom: 0,
        justifyContent: "center",
    },
});

export default Input;
