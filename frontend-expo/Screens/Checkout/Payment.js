import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Surface, Text } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";

const methods = [
    { name: "Cash on Delivery", value: 1 },
    { name: "Bank Transfer", value: 2 },
    { name: "Card Payment", value: 3 },
];
const paymentCards = [
    { name: "Wallet", value: 1 },
    { name: "Visa", value: 2 },
    { name: "MasterCard", value: 3 },
    { name: "Other", value: 4 },
];

const Payment = ({ route }) => {
    const order = route.params?.order;
    const [selected, setSelected] = useState(1);
    const [card, setCard] = useState("");
    const navigation = useNavigation();

    const selectedMethod = methods.find((method) => method.value === selected)?.name || "Cash on Delivery";

    const onContinue = () => {
        navigation.navigate("Confirm", {
            order,
            paymentMethod: selectedMethod,
            paymentCard: selected === 3 ? card : "",
        });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.subtitle}>Choose how you want to pay for this order</Text>

            <View style={styles.methodList}>
                {methods.map((item) => {
                    const active = selected === item.value;
                    return (
                        <TouchableOpacity
                            key={item.value}
                            style={[styles.methodCard, active && styles.methodCardActive]}
                            onPress={() => setSelected(item.value)}
                        >
                            <View style={styles.methodLeft}>
                                <View style={[styles.methodIconCircle, active && styles.methodIconCircleActive]}>
                                    <Ionicons name={active ? "checkmark" : "ellipse-outline"} size={14} color={active ? "#fff" : "#7a7a7a"} />
                                </View>
                                <Text style={[styles.methodText, active && styles.methodTextActive]}>{item.name}</Text>
                            </View>
                            <Ionicons name="wallet-outline" size={18} color={active ? "#fff" : "#7a7a7a"} />
                        </TouchableOpacity>
                    );
                })}
            </View>

            {selected === 3 && (
                <Surface style={styles.cardPickerWrap}>
                    <Picker style={{ height: 50, width: "100%" }} selectedValue={card} onValueChange={setCard}>
                        {paymentCards.map((c) => <Picker.Item key={c.name} label={c.name} value={c.name} />)}
                    </Picker>
                </Surface>
            )}

            <TouchableOpacity style={styles.continueBtn} onPress={onContinue}>
                <Text style={styles.continueText}>Continue</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 14,
        paddingTop: 18,
        backgroundColor: "#f5f5f5",
    },
    subtitle: {
        marginTop: 2,
        color: "#737373",
        fontSize: 13,
        marginBottom: 2,
    },
    methodList: {
        marginTop: 16,
    },
    methodCard: {
        height: 52,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#dedede",
        backgroundColor: "#fff",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 12,
        marginBottom: 10,
    },
    methodCardActive: {
        backgroundColor: "#0d0d0d",
        borderColor: "#0d0d0d",
    },
    methodLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    methodIconCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1,
        borderColor: "#cfcfcf",
        alignItems: "center",
        justifyContent: "center",
    },
    methodIconCircleActive: {
        backgroundColor: "#1f1f1f",
        borderColor: "#1f1f1f",
    },
    methodText: {
        marginLeft: 10,
        color: "#2b2b2b",
        fontWeight: "700",
    },
    methodTextActive: {
        color: "#fff",
    },
    cardPickerWrap: {
        borderRadius: 12,
        marginTop: 2,
        borderWidth: 1,
        borderColor: "#dedede",
        overflow: "hidden",
        backgroundColor: "#fff",
    },
    continueBtn: {
        marginTop: "auto",
        marginBottom: 24,
        backgroundColor: "#0d0d0d",
        height: 50,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    continueText: {
        color: "#fff",
        fontWeight: "800",
        fontSize: 16,
    },
});

export default Payment;
