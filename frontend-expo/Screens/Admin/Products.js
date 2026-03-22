import React, { useState, useCallback, useMemo } from "react";
import {
    View,
    Text,
    FlatList,
    ActivityIndicator,
    StyleSheet,
    RefreshControl,
    ScrollView,
    Image,
    TouchableOpacity,
    TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import { getJwtToken } from "../../assets/common/authToken";
import AppPageHeader from "../../Shared/AppPageHeader";
import Toast from "react-native-toast-message";

const FALLBACK_IMAGE = "https://cdn.pixabay.com/photo/2012/04/01/17/29/box-23649_960_720.png";
const REQUEST_TIMEOUT_MS = 25000;
const COL_WIDTHS = {
    image: 88,
    brand: 110,
    name: 160,
    category: 120,
    priceStock: 130,
    actions: 126,
};
const TABLE_MIN_WIDTH =
    COL_WIDTHS.image + COL_WIDTHS.brand + COL_WIDTHS.name + COL_WIDTHS.category + COL_WIDTHS.priceStock + COL_WIDTHS.actions;

const getCategoryName = (item) => String(item?.category?.name || item?.categoryName || "-");

const ProductImageCell = ({ item }) => {
    const images = useMemo(() => {
        const list = [];
        if (Array.isArray(item?.images)) {
            item.images.forEach((uri) => {
                const clean = String(uri || "").trim();
                if (clean) list.push(clean);
            });
        }

        const mainImage = String(item?.image || "").trim();
        if (mainImage && !list.includes(mainImage)) {
            list.unshift(mainImage);
        }

        return list.length ? list : [FALLBACK_IMAGE];
    }, [item]);

    return (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.imagePager}>
            {images.map((uri, idx) => (
                <Image key={`${uri}-${idx}`} source={{ uri }} style={styles.tableImage} resizeMode="cover" />
            ))}
        </ScrollView>
    );
};

const Products = () => {
    const [productList, setProductList] = useState([]);
    const [productFilter, setProductFilter] = useState([]);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState("");
    const [refreshing, setRefreshing] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [searchValue, setSearchValue] = useState("");
    const navigation = useNavigation();

    const searchProduct = (text) => {
        setSearchValue(text);
        if (text === "") {
            setProductFilter(productList);
            return;
        }
        setProductFilter(
            productList.filter((i) =>
                String(i?.name || "").toLowerCase().includes(text.toLowerCase())
                || String(i?.brand || "").toLowerCase().includes(text.toLowerCase())
                || getCategoryName(i).toLowerCase().includes(text.toLowerCase())
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
                Toast.show({ topOffset: 60, type: "success", text1: "Product deleted" });
            })
            .catch((error) => {
                Toast.show({
                    topOffset: 60,
                    type: "error",
                    text1: error?.response?.data?.message || "Failed to delete product",
                });
            })
            .finally(() => setDeletingId(null));
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        axios
            .get(`${baseURL}products`, { timeout: REQUEST_TIMEOUT_MS })
            .then((res) => {
                setProductList(res.data);
                setProductFilter(
                    searchValue
                        ? (res.data || []).filter((i) =>
                            String(i?.name || "").toLowerCase().includes(searchValue.toLowerCase())
                            || String(i?.brand || "").toLowerCase().includes(searchValue.toLowerCase())
                            || getCategoryName(i).toLowerCase().includes(searchValue.toLowerCase())
                        )
                        : res.data
                );
            })
            .catch((error) => {
                Toast.show({
                    topOffset: 60,
                    type: "error",
                    text1: error?.response?.data?.message || "Could not refresh products",
                });
            })
            .finally(() => setRefreshing(false));
    }, [searchValue]);

    useFocusEffect(
        useCallback(() => {
            getJwtToken()
                .then((res) => setToken(res || ""))
                .catch((error) => console.log(error));
            axios
                .get(`${baseURL}products`, { timeout: REQUEST_TIMEOUT_MS })
                .then((res) => {
                    setProductList(res.data);
                    setProductFilter(res.data);
                })
                .catch(() => {
                    setProductList([]);
                    setProductFilter([]);
                    Toast.show({ topOffset: 60, type: "error", text1: "Failed to load products" });
                })
                .finally(() => setLoading(false));

            return () => {
                setProductList([]);
                setProductFilter([]);
                setLoading(true);
            };
        }, [])
    );

    return (
        <View style={styles.container}>
            <AppPageHeader title="Products" />

            <View style={styles.toolbar}>
                <View style={styles.searchWrap}>
                    <Ionicons name="search-outline" size={18} color="#666" style={styles.searchIcon} />
                    <TextInput
                        value={searchValue}
                        onChangeText={searchProduct}
                        placeholder="Search by brand, name, or category"
                        placeholderTextColor="#a5a5a5"
                        style={styles.searchInput}
                    />
                </View>

                <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate("ProductForm")}>
                    <Ionicons name="add-outline" size={16} color="#fff" />
                    <Text style={styles.addBtnText}>Add Product</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.spinner}>
                    <ActivityIndicator size="large" color="#111" />
                </View>
            ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableOuter}>
                    <View style={[styles.tableWrap, { minWidth: TABLE_MIN_WIDTH }]}> 
                        <View style={styles.tableHeaderRow}>
                            <Text style={[styles.headerCell, { width: COL_WIDTHS.image }]}>Image</Text>
                            <Text style={[styles.headerCell, { width: COL_WIDTHS.brand }]}>Brand</Text>
                            <Text style={[styles.headerCell, { width: COL_WIDTHS.name }]}>Product Name</Text>
                            <Text style={[styles.headerCell, { width: COL_WIDTHS.category }]}>Category</Text>
                            <Text style={[styles.headerCell, { width: COL_WIDTHS.priceStock }]}>Price / Stock</Text>
                            <Text style={[styles.headerCell, { width: COL_WIDTHS.actions }]}>Actions</Text>
                        </View>

                        <FlatList
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                            data={productFilter}
                            keyExtractor={(item) => String(item.id || item._id)}
                            ListEmptyComponent={<Text style={styles.emptyText}>No products found.</Text>}
                            contentContainerStyle={styles.tableBody}
                            renderItem={({ item, index }) => {
                                const rowBackground = index % 2 === 0 ? "#fff" : "#f2f2f2";
                                const id = item.id || item._id;
                                const price = Number(item?.price || 0);
                                const stock = Number(item?.countInStock || 0);
                                return (
                                    <View style={[styles.tableRow, { backgroundColor: rowBackground }]}>
                                        <View style={[styles.rowCell, { width: COL_WIDTHS.image }]}>
                                            <ProductImageCell item={item} />
                                        </View>
                                        <Text numberOfLines={2} style={[styles.rowCellText, { width: COL_WIDTHS.brand }]}>{String(item?.brand || "-")}</Text>
                                        <Text numberOfLines={2} style={[styles.rowCellText, { width: COL_WIDTHS.name }]}>{String(item?.name || "-")}</Text>
                                        <Text numberOfLines={2} style={[styles.rowCellText, { width: COL_WIDTHS.category }]}>{getCategoryName(item)}</Text>
                                        <View style={[styles.rowCell, { width: COL_WIDTHS.priceStock, alignItems: "flex-start" }]}>
                                            <Text style={styles.priceText}>$ {price.toFixed(2)}</Text>
                                            <Text style={styles.stockText}>Stock {stock}</Text>
                                        </View>
                                        <View style={[styles.rowCell, { width: COL_WIDTHS.actions, flexDirection: "row", justifyContent: "center" }]}>
                                            <TouchableOpacity
                                                style={styles.iconBtn}
                                                onPress={() => navigation.navigate("ProductForm", { item })}
                                            >
                                                <Ionicons name="create-outline" size={16} color="#222" />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.iconBtn}
                                                onPress={() => deleteProduct(id)}
                                                disabled={deletingId === id}
                                            >
                                                {deletingId === id ? (
                                                    <ActivityIndicator size="small" color="#9b1c1c" />
                                                ) : (
                                                    <Ionicons name="trash-outline" size={16} color="#9b1c1c" />
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            }}
                        />
                    </View>
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    toolbar: {
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 8,
        flexDirection: "row",
        alignItems: "center",
    },
    searchWrap: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#d8d8d8",
        backgroundColor: "#fff",
        height: 40,
        marginRight: 8,
    },
    searchIcon: {
        marginLeft: 10,
    },
    searchInput: {
        flex: 1,
        color: "#111",
        fontSize: 13,
        paddingHorizontal: 8,
        height: 40,
    },
    addBtn: {
        height: 40,
        borderRadius: 10,
        backgroundColor: "#111",
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    addBtnText: {
        marginLeft: 4,
        color: "#fff",
        fontSize: 12,
        fontWeight: "700",
    },
    tableOuter: {
        flex: 1,
    },
    tableWrap: {
        flex: 1,
        paddingHorizontal: 12,
        paddingBottom: 16,
    },
    tableHeaderRow: {
        flexDirection: "row",
        borderWidth: 1,
        borderColor: "#dedede",
        backgroundColor: "#efefef",
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        paddingVertical: 8,
    },
    headerCell: {
        color: "#252525",
        fontSize: 12,
        fontWeight: "700",
        paddingHorizontal: 8,
    },
    tableBody: {
        borderWidth: 1,
        borderTopWidth: 0,
        borderColor: "#dedede",
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
        overflow: "hidden",
    },
    tableRow: {
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#e9e9e9",
        minHeight: 74,
        paddingVertical: 6,
    },
    rowCell: {
        paddingHorizontal: 8,
        justifyContent: "center",
    },
    rowCellText: {
        color: "#1f1f1f",
        fontSize: 12,
        paddingHorizontal: 8,
    },
    imagePager: {
        width: 68,
        height: 50,
        borderRadius: 8,
        overflow: "hidden",
        backgroundColor: "#e6e6e6",
    },
    tableImage: {
        width: 68,
        height: 50,
        backgroundColor: "#e6e6e6",
        marginRight: 0,
    },
    priceText: {
        color: "#111",
        fontSize: 12,
        fontWeight: "700",
    },
    stockText: {
        marginTop: 3,
        color: "#555",
        fontSize: 11,
    },
    iconBtn: {
        width: 34,
        height: 34,
        borderRadius: 8,
        backgroundColor: "#f0f0f0",
        borderWidth: 1,
        borderColor: "#d8d8d8",
        alignItems: "center",
        justifyContent: "center",
        marginHorizontal: 3,
    },
    spinner: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyText: {
        color: "#666",
        fontSize: 13,
        textAlign: "center",
        paddingVertical: 20,
    },
});

export default Products;
