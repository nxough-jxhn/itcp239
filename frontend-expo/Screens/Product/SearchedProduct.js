import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { FlatList, TouchableOpacity } from "react-native";
import { Surface, Text, Avatar, Divider } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";

var { width } = Dimensions.get("window");
const FALLBACK_IMAGE = "https://cdn.pixabay.com/photo/2012/04/01/17/29/box-23649_960_720.png";

const SearchedProduct = ({ productsFiltered }) => {
    const navigation = useNavigation();

    const getDisplayPrice = (item) => {
        const original = Number(item?.price || 0);
        const discounted = Number(item?.discountedPrice);
        const onSale = item?.hasActiveDiscount === true || (Number.isFinite(discounted) && discounted < original);
        return {
            onSale,
            original,
            discounted: Number.isFinite(discounted) ? discounted : original,
            percentOff: item?.activePromo?.discountType === "percent"
                ? Math.round(Number(item?.activePromo?.discountValue || 0))
                : original > 0 ? Math.round(((original - (Number.isFinite(discounted) ? discounted : original)) / original) * 100) : 0,
        };
    };

    return (
        <View style={{ width: width }}>
            {productsFiltered.length > 0 ? (
                <Surface>
                    <FlatList
                        data={productsFiltered}
                        keyExtractor={(item) => item._id || item.id}
                        renderItem={({ item }) => {
                            const pricing = getDisplayPrice(item);
                            return (
                                <TouchableOpacity
                                    style={{ width: "50%" }}
                                    onPress={() =>
                                        navigation.navigate("Product Detail", { item })
                                    }
                                >
                                    <Surface style={styles.resultCard}>
                                        <Avatar.Image
                                            size={24}
                                            source={{
                                                uri: item.image || FALLBACK_IMAGE,
                                            }}
                                        />
                                        <Text variant="labelMedium">{item.name}</Text>
                                        <Text variant="labelMedium">{item.description}</Text>
                                        {pricing.onSale ? (
                                            <Text style={styles.saleTag}>{pricing.percentOff > 0 ? `${pricing.percentOff}% OFF` : "ON SALE"}</Text>
                                        ) : null}
                                        <Divider />
                                        {pricing.onSale ? (
                                            <View>
                                                <Text style={styles.oldPrice}>${pricing.original.toFixed(2)}</Text>
                                                <Text style={styles.salePrice}>${pricing.discounted.toFixed(2)}</Text>
                                            </View>
                                        ) : (
                                            <Text variant="labelMedium">${pricing.original.toFixed(2)}</Text>
                                        )}
                                    </Surface>
                                </TouchableOpacity>
                            );
                        }}
                    />
                </Surface>
            ) : (
                <View style={styles.center}>
                    <Text style={{ alignSelf: "center" }}>
                        No products match the selected criteria
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    center: {
        justifyContent: "center",
        alignItems: "center",
        height: 100,
    },
    resultCard: {
        width: "90%",
        padding: 8,
        borderRadius: 8,
        marginBottom: 8,
    },
    saleTag: {
        alignSelf: "flex-start",
        backgroundColor: "#c62828",
        color: "#fff",
        fontSize: 10,
        fontWeight: "700",
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 8,
        overflow: "hidden",
        marginTop: 4,
        marginBottom: 4,
    },
    oldPrice: {
        color: "#777",
        textDecorationLine: "line-through",
        fontSize: 11,
    },
    salePrice: {
        color: "#c62828",
        fontWeight: "700",
        fontSize: 13,
    },
});

export default SearchedProduct;
