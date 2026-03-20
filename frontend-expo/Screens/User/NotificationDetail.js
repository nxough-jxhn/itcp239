import React from "react";
import { View, Text, StyleSheet } from "react-native";
import AppPageHeader from "../../Shared/AppPageHeader";

const NotificationDetail = ({ route }) => {
    const notification = route?.params?.notification || {};
    const data = notification?.data || {};

    const title = notification?.title || "Notification";
    const body = notification?.body || "No message provided.";
    const dateRaw = notification?.date;
    const date = dateRaw ? new Date(dateRaw) : new Date();

    return (
        <View style={styles.container}>
            <AppPageHeader />
            <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.date}>
                {date.toLocaleDateString()} {date.toLocaleTimeString()}
            </Text>
            <Text style={styles.body}>{body}</Text>

            {Object.keys(data).length > 0 ? (
                <View style={styles.metaBox}>
                    <Text style={styles.metaHeading}>Notification Data</Text>
                    {Object.entries(data).map(([key, value]) => (
                        <Text key={key} style={styles.metaText}>
                            {key}: {String(value)}
                        </Text>
                    ))}
                </View>
            ) : null}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    content: {
        padding: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111",
        marginBottom: 8,
    },
    date: {
        fontSize: 12,
        color: "#666",
        marginBottom: 14,
    },
    body: {
        fontSize: 14,
        color: "#222",
        lineHeight: 20,
    },
    metaBox: {
        marginTop: 16,
        backgroundColor: "#fff",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e4e4e4",
        padding: 12,
    },
    metaHeading: {
        fontSize: 13,
        fontWeight: "700",
        color: "#333",
        marginBottom: 6,
    },
    metaText: {
        fontSize: 12,
        color: "#444",
        marginBottom: 2,
    },
});

export default NotificationDetail;
