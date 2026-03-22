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
        backgroundColor: "#f2f2f2",
    },
    content: {
        padding: 14,
    },
    title: {
        fontSize: 16,
        fontWeight: "700",
        color: "#111",
        marginBottom: 6,
    },
    date: {
        fontSize: 11,
        color: "#666",
        marginBottom: 10,
    },
    body: {
        fontSize: 13,
        color: "#222",
        lineHeight: 18,
    },
    metaBox: {
        marginTop: 12,
        backgroundColor: "#fff",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#dcdcdc",
        padding: 10,
    },
    metaHeading: {
        fontSize: 12,
        fontWeight: "700",
        color: "#333",
        marginBottom: 6,
    },
    metaText: {
        fontSize: 11,
        color: "#444",
        marginBottom: 2,
    },
});

export default NotificationDetail;
