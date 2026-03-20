import React from "react";
import {
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    View,
    Text,
} from "react-native";

const CategoryFilter = (props) => {
    return (
        <ScrollView
            bounces={true}
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            style={{ backgroundColor: "#fff" }}
            contentContainerStyle={styles.scrollContent}
        >
            <View style={styles.row}>
                <TouchableOpacity
                    onPress={() => {
                        props.categoryFilter("all");
                        props.setActive(-1);
                    }}
                >
                    <View style={[styles.chip, props.active === -1 ? styles.active : styles.inactive]}>
                        <Text style={[styles.chipText, props.active === -1 ? styles.activeText : styles.inactiveText]}>All</Text>
                    </View>
                </TouchableOpacity>
                {props.categories.map((item) => {
                    const catId = item.id || item._id;
                    return (
                        <TouchableOpacity
                            key={catId}
                            onPress={() => {
                                props.categoryFilter(catId);
                                props.setActive(props.categories.indexOf(item));
                            }}
                        >
                            <View
                                style={[
                                    styles.chip,
                                    props.active === props.categories.indexOf(item)
                                        ? styles.active
                                        : styles.inactive,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.chipText,
                                        props.active === props.categories.indexOf(item)
                                            ? styles.activeText
                                            : styles.inactiveText,
                                    ]}
                                >
                                    {item.name}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: 10,
        paddingBottom: 4,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
    },
    chip: {
        minHeight: 40,
        borderRadius: 20,
        paddingHorizontal: 16,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 7,
    },
    active: {
        backgroundColor: "#111",
    },
    inactive: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#e5e5e5",
    },
    chipText: {
        fontWeight: "700",
        fontSize: 13,
        textTransform: "capitalize",
    },
    activeText: {
        color: "#fff",
    },
    inactiveText: {
        color: "#999",
    },
});

export default CategoryFilter;
