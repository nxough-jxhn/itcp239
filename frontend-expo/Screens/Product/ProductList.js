import React from "react";
import { TouchableOpacity, View, Dimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import ProductCard from "./ProductCard";

var { width } = Dimensions.get("window");

const ProductList = (props) => {
    const { item } = props;
    const navigation = useNavigation();

    return (
        <TouchableOpacity
            style={{ width: "50%", paddingHorizontal: 2 }}
            onPress={() => navigation.navigate("Product Detail", { item })}
        >
            <View style={{ width: width / 2 - 4, backgroundColor: "transparent" }}>
                <ProductCard {...item} />
            </View>
        </TouchableOpacity>
    );
};

export default ProductList;
