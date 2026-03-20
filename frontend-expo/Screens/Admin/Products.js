import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    ActivityIndicator,
    StyleSheet,
    Dimensions,
    RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Searchbar } from "react-native-paper";
import ListItem from "./ListItem";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import EasyButton from "../../Shared/StyledComponents/EasyButton";
import { getJwtToken } from "../../assets/common/authToken";

var { height, width } = Dimensions.get("window");

const Products = () => {
    const [productList, setProductList] = useState([]);
    const [productFilter, setProductFilter] = useState([]);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState("");
    const [refreshing, setRefreshing] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const navigation = useNavigation();

    const ListHeader = () => (
        <View style={styles.listHeader}>
            <View style={styles.headerItem} />
            <View style={styles.headerItem}>
                <Text style={{ fontWeight: "600" }}>Brand</Text>
            </View>
            <View style={styles.headerItem}>
                <Text style={{ fontWeight: "600" }}>Name</Text>
            </View>
            <View style={styles.headerItem}>
                <Text style={{ fontWeight: "600" }}>Category</Text>
            </View>
            <View style={styles.headerItem}>
                <Text style={{ fontWeight: "600" }}>Price</Text>
            </View>
        </View>
    );

    const searchProduct = (text) => {
        if (text === "") {
            setProductFilter(productList);
            return;
        }
        setProductFilter(
            productList.filter((i) =>
                i.name.toLowerCase().includes(text.toLowerCase())
            )
        );
    };

    const deleteProduct = (id) => {
        if (deletingId) return;
        setDeletingId(id);
        axios
            .delete(`${baseURL}products/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                const filter = (items) => items.filter((item) => (item.id || item._id) !== id);
                setProductList((prev) => filter(prev));
                setProductFilter((prev) => filter(prev));
            })
            .catch((error) => console.log(error))
            .finally(() => setDeletingId(null));
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        axios.get(`${baseURL}products`).then((res) => {
            setProductList(res.data);
            setProductFilter(res.data);
            setRefreshing(false);
        });
    }, []);

    useFocusEffect(
        useCallback(() => {
            getJwtToken()
                .then((res) => setToken(res || ""))
                .catch((error) => console.log(error));
            axios
                .get(`${baseURL}products`)
                .then((res) => {
                    setProductList(res.data);
                    setProductFilter(res.data);
                    setLoading(false);
                })
                .catch(() => setLoading(false));

            return () => {
                setProductList([]);
                setProductFilter([]);
                setLoading(true);
            };
        }, [])
    );

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.buttonContainer}>
                <EasyButton
                    secondary
                    medium
                    onPress={() => navigation.navigate("Dashboard")}
                >
                    <Ionicons name="speedometer-outline" size={18} color="white" />
                    <Text style={styles.buttonText}>Dashboard</Text>
                </EasyButton>
                <EasyButton
                    secondary
                    medium
                    onPress={() => navigation.navigate("Orders")}
                >
                    <Ionicons name="bag-outline" size={18} color="white" />
                    <Text style={styles.buttonText}>Orders</Text>
                </EasyButton>
                <EasyButton
                    secondary
                    medium
                    onPress={() => navigation.navigate("ProductForm")}
                >
                    <Ionicons name="add-outline" size={18} color="white" />
                    <Text style={styles.buttonText}>Add Product</Text>
                </EasyButton>
                <EasyButton
                    secondary
                    medium
                    onPress={() => navigation.navigate("Stock Alerts")}
                >
                    <Ionicons name="warning-outline" size={18} color="white" />
                    <Text style={styles.buttonText}>Stock Alerts</Text>
                </EasyButton>
                <EasyButton
                    secondary
                    medium
                    onPress={() => navigation.navigate("Promo Broadcast")}
                >
                    <Ionicons name="megaphone-outline" size={18} color="white" />
                    <Text style={styles.buttonText}>Promos</Text>
                </EasyButton>
                <EasyButton
                    secondary
                    medium
                    onPress={() => navigation.navigate("Categories")}
                >
                    <Ionicons name="pricetag-outline" size={18} color="white" />
                    <Text style={styles.buttonText}>Categories</Text>
                </EasyButton>
            </View>
            <Searchbar
                placeholder="Search"
                onChangeText={(text) => searchProduct(text)}
            />
            {loading ? (
                <View style={styles.spinner}>
                    <ActivityIndicator size="large" color="red" />
                </View>
            ) : (
                <FlatList
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListHeaderComponent={ListHeader}
                    data={productFilter}
                    renderItem={({ item, index }) => (
                        <ListItem
                            item={item}
                            index={index}
                            deleteProduct={deleteProduct}
                            isDeleting={deletingId === (item.id || item._id)}
                        />
                    )}
                    keyExtractor={(item) => String(item.id || item._id)}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    listHeader: {
        flexDirection: "row",
        padding: 5,
        backgroundColor: "gainsboro",
    },
    headerItem: {
        margin: 3,
        width: width / 6,
    },
    spinner: {
        height: height / 2,
        alignItems: "center",
        justifyContent: "center",
    },
    buttonContainer: {
        margin: 20,
        alignSelf: "center",
        flexDirection: "row",
    },
    buttonText: {
        marginLeft: 4,
        color: "white",
    },
});

export default Products;
