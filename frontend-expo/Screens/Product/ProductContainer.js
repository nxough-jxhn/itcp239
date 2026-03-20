import React, { useState, useCallback, useContext, useMemo } from "react";
import {
    View,
    StyleSheet,
    Dimensions,
    ScrollView,
    Text,
    TouchableOpacity,
    RefreshControl,
    Image,
    Platform,
} from "react-native";
import Swiper from "react-native-swiper";
import { useNavigation, DrawerActions, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import CartIcon from "../../Shared/CartIcon";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import { fetchProducts } from "../../Redux/Actions/productActions";
import { fetchWishlistIds, toggleWishlistProduct } from "../../Redux/Actions/wishlistActions";
import AuthGlobal from "../../Context/Store/AuthGlobal";
import { addToCart } from "../../Redux/Actions/cartActions";
import Toast from "react-native-toast-message";

const { width } = Dimensions.get("window");
const FALLBACK_IMAGE = "https://cdn.pixabay.com/photo/2012/04/01/17/29/box-23649_960_720.png";
const bannerData = [
    require("../../assets/images/carousel1-sample.png"),
    require("../../assets/images/carousel2-sample.png"),
    require("../../assets/images/carousel3-sample.png"),
];

const ProductContainer = () => {
    const REQUEST_TIMEOUT_MS = 8000;
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const context = useContext(AuthGlobal);
    const isAdmin = context?.stateUser?.user?.isAdmin === true;
    const productsFromStore = useSelector((state) => state.products?.list || []);
    const wishlistIds = useSelector((state) => state.wishlist?.ids || []);

    const [categories, setCategories] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadCatalogData = useCallback(async () => {
        dispatch(fetchProducts());

        try {
            const res = await axios.get(`${baseURL}categories`, { timeout: REQUEST_TIMEOUT_MS });
            setCategories(Array.isArray(res?.data) ? res.data : []);
        } catch (_error) {
            setCategories([]);
        }
    }, [dispatch]);

    const getCategoryId = (product) => String(product?.category?.id || product?.category?._id || product?.category || "");
    const getCategoryName = (product) => String(product?.category?.name || "Category");

    useFocusEffect(
        useCallback(() => {
            loadCatalogData();
            if (context?.stateUser?.isAuthenticated) {
                dispatch(fetchWishlistIds());
            }

            return () => {
                setCategories([]);
            };
        }, [loadCatalogData, context?.stateUser?.isAuthenticated, dispatch])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadCatalogData();
        setRefreshing(false);
    }, [loadCatalogData]);

    const filteredProducts = useMemo(() => {
        return Array.isArray(productsFromStore) ? productsFromStore : [];
    }, [productsFromStore]);

    const categoryShowcase = useMemo(() => {
        if (!Array.isArray(categories) || categories.length === 0) return [];

        return categories
            .map((category) => {
                const catId = String(category?.id || category?._id || "");
                const firstMatch = filteredProducts.find((product) => getCategoryId(product) === catId);
                if (!firstMatch) return null;
                return {
                    id: `cat-${catId}`,
                    categoryId: catId,
                    categoryName: String(category?.name || "Category"),
                    product: firstMatch,
                };
            })
            .filter(Boolean);
    }, [categories, filteredProducts]);

    const toggleWishlist = async (productId) => {
        const id = String(productId || "").trim();
        if (!id) return;
        const result = await dispatch(toggleWishlistProduct(id));
        if (result?.authRequired) {
            navigation.navigate("User", { screen: "Login" });
            return;
        }
        if (!result?.ok) {
            Toast.show({ topOffset: 60, type: "error", text1: result?.message || "Wishlist update failed" });
        }
    };

    const goToWishlist = () => {
        const tabNav = navigation.getParent?.();
        if (tabNav) {
            tabNav.navigate("User", { screen: "Wishlist" });
            return;
        }
        navigation.navigate("User", { screen: "Wishlist" });
    };

    const goToCart = () => {
        const tabNav = navigation.getParent?.();
        if (isAdmin) {
            if (tabNav) {
                tabNav.navigate("Admin", { screen: "Dashboard" });
                return;
            }
            navigation.navigate("Admin", { screen: "Dashboard" });
            return;
        }

        if (tabNav) {
            tabNav.navigate("Cart Screen");
            return;
        }
        navigation.navigate("Cart Screen");
    };

    const renderCategoryCard = (entry) => {
        const item = entry?.product || {};
        return (
            <TouchableOpacity
                key={entry.id}
                style={styles.categoryCard}
                onPress={() => navigation.navigate("Catalog Search", {
                    preselectedCategoryId: entry?.categoryId,
                    preselectedCategoryName: entry?.categoryName,
                })}
                activeOpacity={0.9}
            >
                <Image source={{ uri: item?.image || FALLBACK_IMAGE }} style={styles.categoryImage} resizeMode="cover" />
                <Text style={styles.categoryCardTitle} numberOfLines={1}>{entry?.categoryName || "Category"}</Text>
                <Text style={styles.categoryCardDesc} numberOfLines={1}>{item?.name || "Product"}</Text>
            </TouchableOpacity>
        );
    };

    const renderProductCard = (item, index) => {
        const productId = String(item?.id || item?._id || index);
        const soldCount = Number(item?.soldCount || 0);
        const rating = Number(item?.rating || 0);
        const inStock = Number(item?.countInStock || 0);
        const isWishlisted = wishlistIds.includes(productId);

        return (
            <TouchableOpacity
                key={productId}
                style={styles.productEchoLayer}
                activeOpacity={0.92}
                onPress={() => navigation.navigate("Product Detail", { item })}
            >
                <View style={styles.productCard}>
                    <View style={styles.productTopLine}>
                        <Ionicons name="cube-outline" size={14} color="#111" style={styles.productCategoryGhostIcon} />
                        <Text style={styles.productCategoryText} numberOfLines={1}>{getCategoryName(item).toUpperCase()}</Text>
                        {!isAdmin ? (
                            <TouchableOpacity
                                style={styles.productHeartBtn}
                                onPress={(event) => {
                                    event?.stopPropagation?.();
                                    toggleWishlist(productId);
                                }}
                            >
                                <Ionicons name={isWishlisted ? "heart" : "heart-outline"} size={16} color={isWishlisted ? "#d62027" : "#fff"} />
                            </TouchableOpacity>
                        ) : null}
                    </View>

                    <Image source={{ uri: item?.image || FALLBACK_IMAGE }} style={styles.productImage} resizeMode="cover" />

                    <View style={styles.productNameRow}>
                        <Text style={styles.productName} numberOfLines={1}>{item?.name || "Product"}</Text>
                        {!isAdmin ? (
                            <TouchableOpacity
                                style={styles.productBagBtn}
                                onPress={(event) => {
                                    event?.stopPropagation?.();
                                    dispatch(addToCart({ ...item, quantity: 1 }));
                                    Toast.show({ topOffset: 60, type: "success", text1: `${item?.name || "Product"} added to Cart` });
                                }}
                            >
                                <Ionicons name="bag-outline" size={14} color="#fff" />
                            </TouchableOpacity>
                        ) : null}
                    </View>

                    <Text style={styles.productDesc} numberOfLines={1}>{item?.description || "No description"}</Text>

                    <View style={styles.ratingRow}>
                        <Ionicons name="star" size={15} color="#111" />
                        <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
                        <Text style={styles.soldValue}>({soldCount} Sold)</Text>
                    </View>

                    <View style={styles.productBottomRow}>
                        <View style={styles.stockRow}>
                            <Text style={styles.stockLabel}>Stock</Text>
                            <Text style={styles.stockValue}>{inStock}</Text>
                        </View>
                        <Text style={styles.productPrice}>$ {Number(item?.price || 0).toFixed(2)}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
                    style={styles.menuBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="menu-outline" size={24} color="#000" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>SnapShop</Text>

                <View style={styles.headerRightIcons}>
                    <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate("Catalog Search")}>
                        <Ionicons name="search-outline" size={22} color="#000" />
                    </TouchableOpacity>

                    {!isAdmin ? (
                        <TouchableOpacity style={styles.headerIconBtn} onPress={goToWishlist}>
                            <Ionicons name="heart-outline" size={22} color="#000" />
                        </TouchableOpacity>
                    ) : null}

                    <TouchableOpacity onPress={goToCart} style={styles.headerIconBtn}>
                        <Ionicons name={isAdmin ? "settings-outline" : "bag-outline"} size={22} color="#000" />
                        {!isAdmin ? <CartIcon /> : null}
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <View style={styles.carouselWrap}>
                    <Swiper
                        autoplay
                        autoplayTimeout={5}
                        showsButtons={false}
                        showsPagination={false}
                        loop
                        style={styles.carouselSwiper}
                    >
                        {bannerData.map((image, idx) => (
                            <Image key={idx} source={image} style={styles.carouselImage} resizeMode="cover" />
                        ))}
                    </Swiper>
                </View>

                <View style={styles.sectionWrap}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Category</Text>
                        <TouchableOpacity style={styles.viewAllBtn} onPress={() => navigation.navigate("Catalog Search") }>
                            <Text style={styles.viewAllText}>View All</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.categoryGrid}>
                        {categoryShowcase.length > 0 ? categoryShowcase.map(renderCategoryCard) : (
                            <Text style={styles.emptyText}>No categories with products yet.</Text>
                        )}
                    </View>
                </View>

                <View style={styles.sectionDivider} />

                <View style={styles.sectionWrap}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Products</Text>
                        <TouchableOpacity style={styles.viewAllBtn} onPress={() => navigation.navigate("Catalog Search") }>
                            <Text style={styles.viewAllText}>View All</Text>
                        </TouchableOpacity>
                    </View>
                    {filteredProducts.length > 0 ? (
                        <View style={styles.productsGrid}>
                            {filteredProducts.map(renderProductCard)}
                        </View>
                    ) : (
                        <Text style={styles.emptyText}>No products found.</Text>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f5f5f5" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 12,
        paddingTop: 48,
        paddingBottom: 10,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#efefef",
    },
    menuBtn: {
        width: 36,
        alignItems: "flex-start",
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: "#000",
        flex: 1,
        textAlign: "center",
        marginRight: 18,
    },
    headerRightIcons: {
        flexDirection: "row",
        alignItems: "center",
    },
    headerIconBtn: {
        width: 30,
        height: 30,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 8,
        position: "relative",
    },
    scrollContent: {
        paddingBottom: 24,
    },
    carouselWrap: {
        marginTop: 10,
        width,
        backgroundColor: "#fff",
    },
    carouselSwiper: {
        height: 196,
    },
    carouselImage: {
        width: "100%",
        height: 196,
    },
    sectionWrap: {
        marginTop: 14,
        paddingHorizontal: 12,
    },
    sectionHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 21,
        fontWeight: "700",
        color: "#111",
        fontFamily: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }),
    },
    viewAllBtn: {
        paddingHorizontal: 2,
        paddingVertical: 2,
    },
    viewAllText: {
        fontSize: 12,
        color: "#8c8c8c",
        fontWeight: "600",
    },
    categoryGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginHorizontal: -2,
    },
    categoryCard: {
        width: (width - 24 - 16) / 3,
        marginHorizontal: 2,
        marginBottom: 8,
        paddingHorizontal: 4,
        alignItems: "center",
    },
    categoryImage: {
        width: "100%",
        aspectRatio: 1,
        borderRadius: 0,
        backgroundColor: "#f0f0f0",
        marginBottom: 5,
        borderWidth: 1,
        borderColor: "#d9d9d9",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.16,
        shadowRadius: 3,
        elevation: 2,
    },
    categoryCardTitle: {
        fontSize: 11,
        fontWeight: "700",
        color: "#111",
        textAlign: "center",
    },
    categoryCardDesc: {
        fontSize: 10,
        color: "#666",
        marginTop: 1,
        fontStyle: "italic",
        textAlign: "center",
    },
    productsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    productEchoLayer: {
        width: (width - 24 - 12) / 2,
        marginBottom: 14,
        borderRadius: 19,
        backgroundColor: "rgba(115,115,115,0.35)",
        paddingRight: 6,
        paddingBottom: 6,
        shadowColor: "#000",
        shadowOffset: { width: 3, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    productCard: {
        backgroundColor: "#fff",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#cfcfcf",
        padding: 9,
        minHeight: 226,
    },
    productTopLine: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        minHeight: 22,
        position: "relative",
    },
    productCategoryGhostIcon: {
        position: "absolute",
        left: 0,
        opacity: 0.28,
    },
    productCategoryText: {
        fontSize: 10,
        color: "#111",
        textAlign: "center",
        flex: 1,
    },
    productHeartBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#0e0e0e",
        alignItems: "center",
        justifyContent: "center",
        position: "absolute",
        right: 0,
        top: -1,
    },
    productImage: {
        width: "100%",
        height: 72,
        borderRadius: 10,
        marginTop: 6,
        backgroundColor: "#f2f2f2",
    },
    productNameRow: {
        marginTop: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    productName: {
        flex: 1,
        fontSize: 15,
        fontWeight: "800",
        color: "#111",
        marginRight: 8,
    },
    productBagBtn: {
        width: 26,
        height: 26,
        borderRadius: 8,
        backgroundColor: "#0c0c0c",
        alignItems: "center",
        justifyContent: "center",
    },
    productDesc: {
        marginTop: 2,
        fontSize: 10,
        color: "#3a3a3a",
    },
    ratingRow: {
        marginTop: 6,
        flexDirection: "row",
        alignItems: "center",
    },
    ratingValue: {
        marginLeft: 6,
        fontSize: 10,
        fontWeight: "800",
        color: "#111",
    },
    soldValue: {
        marginLeft: 5,
        fontSize: 10,
        color: "#2f2f2f",
    },
    productBottomRow: {
        marginTop: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    stockRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    stockLabel: {
        fontSize: 12,
        fontWeight: "800",
        color: "#111",
    },
    stockValue: {
        fontSize: 12,
        color: "#111",
        marginLeft: 4,
    },
    productPrice: {
        fontSize: 15,
        fontWeight: "800",
        color: "#111",
    },
    emptyText: {
        color: "#666",
        fontSize: 13,
        paddingVertical: 6,
    },
    sectionDivider: {
        marginHorizontal: 12,
        marginTop: 2,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(0,0,0,0.08)",
    },
});

export default ProductContainer;
