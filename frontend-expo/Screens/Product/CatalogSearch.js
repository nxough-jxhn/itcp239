import React, { useCallback, useContext, useMemo, useRef, useState } from "react";
import {
    View,
    StyleSheet,
    Text,
    TouchableOpacity,
    ScrollView,
    Image,
    RefreshControl,
    TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useNavigation, useFocusEffect, DrawerActions, useRoute } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import Toast from "react-native-toast-message";
import baseURL from "../../assets/common/baseurl";
import CartIcon from "../../Shared/CartIcon";
import AuthGlobal from "../../Context/Store/AuthGlobal";
import { fetchProducts } from "../../Redux/Actions/productActions";
import { fetchWishlistIds, toggleWishlistProduct } from "../../Redux/Actions/wishlistActions";
import { addToCart } from "../../Redux/Actions/cartActions";
import { getProductPricing } from "../../assets/common/productPricing";

const REQUEST_TIMEOUT_MS = 20000;
const FALLBACK_IMAGE = "https://cdn.pixabay.com/photo/2012/04/01/17/29/box-23649_960_720.png";

const CatalogSearch = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const dispatch = useDispatch();
    const context = useContext(AuthGlobal);
    const isAdmin = context?.stateUser?.user?.isAdmin === true;

    const products = useSelector((state) => state.products?.list || []);
    const productsLoading = useSelector((state) => state.products?.loadingList === true);
    const productsError = useSelector((state) => state.products?.error || "");
    const wishlistIds = useSelector((state) => state.wishlist?.ids || []);

    const [categories, setCategories] = useState([]);
    const [categoryValue, setCategoryValue] = useState("all");
    const [searchValue, setSearchValue] = useState("");
    const [showSearchInput, setShowSearchInput] = useState(true);
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [priceFloor, setPriceFloor] = useState(0);
    const [priceCeil, setPriceCeil] = useState(1000);
    const [minPrice, setMinPrice] = useState(0);
    const [maxPrice, setMaxPrice] = useState(1000);
    const [onSaleOnly, setOnSaleOnly] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const searchInputRef = useRef(null);

    const getCategoryId = (product) => String(product?.category?.id || product?.category?._id || product?.category || "");

    const getEffectivePrice = (product) => getProductPricing(product).displayPrice;

    const isOnSale = (product) => getProductPricing(product).isSale;

    const loadData = useCallback(async () => {
        dispatch(fetchProducts());

        try {
            const res = await axios.get(`${baseURL}categories`, { timeout: REQUEST_TIMEOUT_MS });
            setCategories(Array.isArray(res?.data) ? res.data : []);
        } catch (_error) {
            setCategories([]);
        }

        if (context?.stateUser?.isAuthenticated) {
            dispatch(fetchWishlistIds());
        }
    }, [dispatch, context?.stateUser?.isAuthenticated]);

    useFocusEffect(
        useCallback(() => {
            loadData();
            return () => {};
        }, [loadData])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);

    const filteredProducts = useMemo(() => {
        const source = Array.isArray(products) ? products : [];
        const q = String(searchValue || "").trim().toLowerCase();

        return source.filter((product) => {
            const name = String(product?.name || "").toLowerCase();
            const desc = String(product?.description || "").toLowerCase();
            const brand = String(product?.brand || "").toLowerCase();
            const matchesSearch = !q || name.includes(q) || desc.includes(q) || brand.includes(q);

            const productCategoryId = getCategoryId(product);
            const matchesCategory = categoryValue === "all" || String(productCategoryId) === String(categoryValue);

            const effectivePrice = getEffectivePrice(product);
            const matchesPrice = effectivePrice >= Number(minPrice) && effectivePrice <= Number(maxPrice);
            const matchesSale = !onSaleOnly || isOnSale(product);

            return matchesSearch && matchesCategory && matchesPrice && matchesSale;
        });
    }, [products, searchValue, categoryValue, minPrice, maxPrice, onSaleOnly]);

    useFocusEffect(
        useCallback(() => {
            const source = Array.isArray(products) ? products : [];
            const prices = source.map((item) => getEffectivePrice(item));
            const min = prices.length ? Math.floor(Math.min(...prices)) : 0;
            const max = prices.length ? Math.ceil(Math.max(...prices)) : 1000;
            setPriceFloor(min);
            setPriceCeil(max);
            setMinPrice(min);
            setMaxPrice(max);
        }, [products])
    );

    useFocusEffect(
        useCallback(() => {
            const preselectedCategoryId = String(route?.params?.preselectedCategoryId || "").trim();
            if (!preselectedCategoryId) return () => {};
            setCategoryValue(preselectedCategoryId);
            return () => {};
        }, [route?.params?.preselectedCategoryId])
    );

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

    const onPressSearch = () => {
        if (!showSearchInput) {
            setShowSearchInput(true);
            setTimeout(() => searchInputRef.current?.focus?.(), 80);
            return;
        }
        searchInputRef.current?.focus?.();
    };

    const resetFilters = () => {
        setCategoryValue("all");
        setOnSaleOnly(false);
        setMinPrice(priceFloor);
        setMaxPrice(priceCeil);
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

                <Text style={styles.headerTitle}>PeakPlay</Text>

                <View style={styles.headerRightIcons}>
                    <TouchableOpacity style={styles.headerIconBtn} onPress={onPressSearch}>
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

            {showSearchInput ? (
                <View style={styles.searchRowWrap}>
                    <View style={styles.searchWrap}>
                        <Ionicons name="search-outline" size={19} color="#666" />
                        <TextInput
                            ref={searchInputRef}
                            value={searchValue}
                            onChangeText={setSearchValue}
                            placeholder="Search product catalog"
                            placeholderTextColor="#9d9d9d"
                            style={styles.searchInput}
                        />
                    </View>

                    <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterPanel((prev) => !prev)}>
                        <Ionicons name="options-outline" size={16} color="#fff" />
                        <Text style={styles.filterButtonText}>Filter</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                        <Text style={styles.resetButtonText}>Reset</Text>
                    </TouchableOpacity>
                </View>
            ) : null}

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryRow}
                >
                    <TouchableOpacity
                        style={styles.categoryTab}
                        onPress={() => setCategoryValue("all")}
                    >
                        <Text style={[styles.categoryTabText, categoryValue === "all" && styles.categoryTabTextActive]}>All</Text>
                        {categoryValue === "all" ? <View style={styles.categoryTabIndicator} /> : null}
                    </TouchableOpacity>

                    {categories.map((category) => {
                        const catId = String(category?.id || category?._id || "");
                        const active = categoryValue === catId;
                        return (
                            <TouchableOpacity
                                key={catId}
                                style={styles.categoryTab}
                                onPress={() => setCategoryValue(catId)}
                            >
                                <Text style={[styles.categoryTabText, active && styles.categoryTabTextActive]}>{category?.name || "Category"}</Text>
                                {active ? <View style={styles.categoryTabIndicator} /> : null}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {showFilterPanel ? (
                    <View style={styles.filterPanel}>
                        <Text style={styles.filterLabel}>Min Price: $ {Number(minPrice).toFixed(0)}</Text>
                        <Slider
                            minimumValue={priceFloor}
                            maximumValue={priceCeil}
                            value={minPrice}
                            onValueChange={(value) => setMinPrice(Math.min(Math.floor(value), maxPrice))}
                            step={1}
                            minimumTrackTintColor="#111"
                            maximumTrackTintColor="#bbb"
                        />

                        <Text style={styles.filterLabel}>Max Price: $ {Number(maxPrice).toFixed(0)}</Text>
                        <Slider
                            minimumValue={priceFloor}
                            maximumValue={priceCeil}
                            value={maxPrice}
                            onValueChange={(value) => setMaxPrice(Math.max(Math.floor(value), minPrice))}
                            step={1}
                            minimumTrackTintColor="#111"
                            maximumTrackTintColor="#bbb"
                        />

                        <View style={styles.saleToggleRow}>
                            <Text style={styles.saleToggleLabel}>On Sale Only</Text>
                            <TouchableOpacity
                                style={[styles.saleToggleButton, onSaleOnly && styles.saleToggleButtonActive]}
                                onPress={() => setOnSaleOnly((prev) => !prev)}
                            >
                                <Text style={[styles.saleToggleText, onSaleOnly && styles.saleToggleTextActive]}>
                                    {onSaleOnly ? "ON" : "OFF"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : null}

                <View style={styles.sectionDivider} />

                <View style={styles.productListWrap}>
                    {productsLoading ? (
                        <Text style={styles.emptyText}>Loading products...</Text>
                    ) : productsError ? (
                        <Text style={styles.reduxErrorText}>Failed to load products. Pull down to retry.</Text>
                    ) : filteredProducts.map((item, index) => {
                        const productId = String(item?.id || item?._id || index);
                        const soldCount = Number(item?.soldCount || 0);
                        const rating = Number(item?.rating || 0);
                        const inStock = Number(item?.countInStock || 0);
                        const isWishlisted = wishlistIds.includes(productId);
                        const pricing = getProductPricing(item);

                        return (
                            <TouchableOpacity
                                key={productId}
                                style={styles.rowTouch}
                                activeOpacity={0.9}
                                onPress={() => navigation.navigate("Product Detail", { item })}
                            >
                                <View style={styles.rowHeaderOutside}>
                                    <Text style={styles.rowCategoryOutside} numberOfLines={1}>
                                        {String(item?.category?.name || "Category").toUpperCase()}
                                    </Text>
                                </View>

                                <View style={styles.rowActionsOutside}>
                                    {!isAdmin ? (
                                        <TouchableOpacity
                                            style={styles.iconSquareBtn}
                                            onPress={(event) => {
                                                event?.stopPropagation?.();
                                                toggleWishlist(productId);
                                            }}
                                        >
                                            <Ionicons
                                                name={isWishlisted ? "heart" : "heart-outline"}
                                                size={16}
                                                color={isWishlisted ? "#d62027" : "#fff"}
                                            />
                                        </TouchableOpacity>
                                    ) : null}

                                    {!isAdmin ? (
                                        <TouchableOpacity
                                            style={[styles.iconSquareBtn, inStock <= 0 && styles.iconSquareBtnDisabled]}
                                            onPress={(event) => {
                                                event?.stopPropagation?.();
                                                if (inStock <= 0) {
                                                    Toast.show({ topOffset: 60, type: "error", text1: "Product is currently unavailable" });
                                                    return;
                                                }
                                                dispatch(addToCart({ ...item, quantity: 1, price: pricing.displayPrice, originalPrice: pricing.originalPrice }));
                                                Toast.show({ topOffset: 60, type: "success", text1: `${item?.name || "Product"} added to Cart` });
                                            }}
                                        >
                                            <Ionicons name="bag-outline" size={16} color="#fff" />
                                        </TouchableOpacity>
                                    ) : null}
                                </View>

                                <View style={styles.rowCardEcho}>
                                    <View style={styles.rowCard}>
                                        <View style={styles.rowImageWrap}>
                                            <Image source={{ uri: item?.image || FALLBACK_IMAGE }} style={styles.rowImage} resizeMode="cover" />
                                            {pricing.isSale ? (
                                                <View style={styles.rowSaleBadge}>
                                                    <Text style={styles.rowSaleBadgeText}>{pricing.percentOff > 0 ? `${pricing.percentOff}% OFF` : "SALE"}</Text>
                                                </View>
                                            ) : null}
                                            {inStock <= 0 ? (
                                                <View style={styles.rowStockOverlayBadge}>
                                                    <Text style={styles.rowStockOverlayText}>OUT OF STOCK</Text>
                                                </View>
                                            ) : null}
                                        </View>

                                        <View style={styles.rowContent}>
                                            <Text style={styles.rowName} numberOfLines={1}>{item?.name || "Product Name"}</Text>
                                            <Text style={styles.rowDesc} numberOfLines={1}>{item?.description || "Product Description"}</Text>

                                            <View style={styles.rowMetricsGroup}>
                                                <View style={styles.rowMetricLine}>
                                                    <View style={styles.rowRatingWrap}>
                                                        <Ionicons name="star" size={16} color="#111" />
                                                        <Text style={styles.rowRatingText}>{rating.toFixed(1)}</Text>
                                                    </View>
                                                    <View style={styles.rowStockWrap}>
                                                        <Text style={styles.rowStockLabel}>Stock</Text>
                                                        <Text style={styles.rowStockValue}>{inStock}</Text>
                                                    </View>
                                                </View>

                                                <View style={styles.rowMetricLine}>
                                                    <Text style={styles.rowSoldText}>{soldCount} Sold</Text>
                                                    <View style={styles.rowPriceWrap}>
                                                        {pricing.isSale ? <Text style={styles.rowOldPrice}>$ {pricing.originalPrice.toFixed(2)}</Text> : null}
                                                        <Text style={[styles.rowPrice, pricing.isSale && styles.rowPriceSale]}>$ {pricing.displayPrice.toFixed(2)}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                            {inStock <= 0 ? <Text style={styles.rowUnavailable}>Currently unavailable</Text> : null}
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}

                    {!productsLoading && !productsError && filteredProducts.length === 0 ? (
                        <Text style={styles.emptyText}>No products found.</Text>
                    ) : null}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
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
    searchWrap: {
        flex: 1,
        backgroundColor: "#fff",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#e7e7e7",
        height: 46,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
    },
    searchRowWrap: {
        marginHorizontal: 12,
        marginTop: 8,
        marginBottom: 4,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        color: "#111",
        fontSize: 14,
    },
    scrollContent: {
        paddingBottom: 24,
    },
    categoryRow: {
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 6,
        flexDirection: "row",
        alignItems: "center",
    },
    categoryTab: {
        marginRight: 22,
        minHeight: 26,
        justifyContent: "center",
        alignItems: "center",
    },
    categoryTabText: {
        fontSize: 13,
        color: "#7d7d7d",
        fontWeight: "600",
    },
    categoryTabTextActive: {
        color: "#111",
        fontWeight: "700",
    },
    categoryTabIndicator: {
        marginTop: 5,
        width: "100%",
        minWidth: 18,
        borderBottomWidth: 2,
        borderBottomColor: "#88d4de",
    },
    filterButton: {
        height: 46,
        borderRadius: 12,
        backgroundColor: "#111",
        paddingHorizontal: 10,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
    },
    filterButtonText: {
        color: "#fff",
        marginLeft: 6,
        fontSize: 12,
        fontWeight: "700",
    },
    resetButton: {
        height: 46,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#ddd",
        paddingHorizontal: 10,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fff",
    },
    resetButtonText: {
        color: "#444",
        fontSize: 12,
        fontWeight: "700",
    },
    filterPanel: {
        marginHorizontal: 12,
        marginBottom: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#e4e4e4",
        backgroundColor: "#fff",
        padding: 12,
    },
    filterLabel: {
        fontSize: 12,
        color: "#333",
        fontWeight: "600",
    },
    saleToggleRow: {
        marginTop: 4,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    saleToggleLabel: {
        fontSize: 13,
        color: "#333",
        fontWeight: "600",
    },
    saleToggleButton: {
        minWidth: 56,
        height: 30,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: "#d8d8d8",
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
    },
    saleToggleButtonActive: {
        backgroundColor: "#111",
        borderColor: "#111",
    },
    saleToggleText: {
        color: "#666",
        fontSize: 12,
        fontWeight: "700",
    },
    saleToggleTextActive: {
        color: "#fff",
    },
    productListWrap: {
        paddingHorizontal: 12,
        paddingTop: 10,
    },
    rowTouch: {
        marginBottom: 24,
        paddingTop: 12,
        position: "relative",
    },
    rowHeaderOutside: {
        position: "absolute",
        top: 0,
        left: 132,
        right: 118,
        zIndex: 5,
    },
    rowCategoryOutside: {
        color: "#222",
        fontSize: 12,
        letterSpacing: 0.4,
        fontWeight: "800",
    },
    rowActionsOutside: {
        position: "absolute",
        top: 0,
        right: 18,
        zIndex: 6,
        flexDirection: "row",
        alignItems: "center",
    },
    rowCardEcho: {
        borderRadius: 20,
        backgroundColor: "rgba(110,110,110,0.35)",
        paddingRight: 6,
        paddingBottom: 6,
        marginTop: 8,
    },
    rowCard: {
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#d6d6d6",
        backgroundColor: "#fff",
        minHeight: 132,
        paddingLeft: 134,
        paddingTop: 14,
        paddingRight: 12,
        paddingBottom: 4,
    },
    rowImageWrap: {
        position: "absolute",
        left: 12,
        top: -24,
        width: 114,
        height: 136,
        borderRadius: 10,
        overflow: "hidden",
        backgroundColor: "#f2f2f2",
        borderWidth: 1,
        borderColor: "#e0e0e0",
    },
    rowImage: {
        width: "100%",
        height: "100%",
    },
    rowSaleBadge: {
        position: "absolute",
        top: 8,
        right: 8,
        backgroundColor: "#111",
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 3,
    },
    rowSaleBadgeText: {
        color: "#fff",
        fontSize: 9,
        fontWeight: "800",
        letterSpacing: 0.4,
    },
    rowStockOverlayBadge: {
        position: "absolute",
        top: 8,
        left: 8,
        backgroundColor: "rgba(0,0,0,0.82)",
        borderRadius: 8,
        paddingHorizontal: 7,
        paddingVertical: 3,
    },
    rowStockOverlayText: {
        color: "#fff",
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    rowContent: {
        flex: 1,
    },
    iconSquareBtn: {
        width: 34,
        height: 34,
        borderRadius: 8,
        backgroundColor: "#0f0f0f",
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 6,
    },
    iconSquareBtnDisabled: {
        backgroundColor: "#9a9a9a",
    },
    rowName: {
        marginTop: 1,
        fontSize: 14,
        lineHeight: 18,
        color: "#111",
        fontWeight: "800",
        fontFamily: "serif",
    },
    rowDesc: {
        marginTop: 0,
        fontSize: 11,
        color: "#343434",
        marginBottom: 1,
    },
    rowMetricsGroup: {
        marginTop: 8,
    },
    rowMetricLine: {
        marginTop: 3,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    rowRatingWrap: {
        flexDirection: "row",
        alignItems: "center",
    },
    rowRatingText: {
        marginLeft: 6,
        fontSize: 13,
        color: "#111",
        fontWeight: "800",
    },
    rowSoldText: {
        fontSize: 12,
        color: "#303030",
        fontWeight: "500",
    },
    rowPrice: {
        fontSize: 17,
        lineHeight: 22,
        color: "#111",
        fontWeight: "800",
        fontFamily: "serif",
    },
    rowPriceSale: {
        color: "#b62020",
    },
    rowPriceWrap: {
        alignItems: "flex-end",
    },
    rowOldPrice: {
        fontSize: 10,
        color: "#777",
        textDecorationLine: "line-through",
    },
    rowStockWrap: {
        flexDirection: "row",
        alignItems: "center",
    },
    rowStockLabel: {
        fontSize: 14,
        color: "#111",
        fontWeight: "800",
    },
    rowStockValue: {
        marginLeft: 8,
        fontSize: 16,
        color: "#111",
    },
    rowUnavailable: {
        marginTop: 4,
        color: "#7a7a7a",
        fontSize: 11,
        fontWeight: "700",
    },
    emptyText: {
        color: "#666",
        fontSize: 13,
        paddingVertical: 8,
    },
    reduxErrorText: {
        color: "#b02020",
        fontSize: 13,
        fontWeight: "700",
        paddingVertical: 8,
    },
    sectionDivider: {
        marginHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(0,0,0,0.08)",
    },
});

export default CatalogSearch;
