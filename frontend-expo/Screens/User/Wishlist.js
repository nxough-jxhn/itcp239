import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    RefreshControl,
    TextInput,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { SwipeListView } from "react-native-swipe-list-view";
import { fetchWishlistItems, toggleWishlistProduct } from "../../Redux/Actions/wishlistActions";
import AuthGlobal from "../../Context/Store/AuthGlobal";
import AppPageHeader from "../../Shared/AppPageHeader";

const FALLBACK_IMAGE = "https://cdn.pixabay.com/photo/2012/04/01/17/29/box-23649_960_720.png";

const Wishlist = () => {
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const context = useContext(AuthGlobal);
    const isAdmin = context?.stateUser?.user?.isAdmin === true;
    const items = useSelector((state) => state.wishlist?.items || []);
    const loading = useSelector((state) => state.wishlist?.loadingItems === true);
    const [search, setSearch] = useState("");
    const autoDeletedRef = useRef({});

    const load = useCallback(() => {
        dispatch(fetchWishlistItems(false));
    }, [dispatch]);

    useFocusEffect(
        useCallback(() => {
            if (isAdmin) return () => {};
            load();
            return () => {};
        }, [load, isAdmin])
    );

    if (isAdmin) {
        return (
            <View style={styles.emptyWrap}>
                <Ionicons name="shield-checkmark-outline" size={60} color="#777" />
                <Text style={styles.emptyTitle}>Customer-only page</Text>
                <Text style={styles.emptySub}>Admins cannot access wishlist.</Text>
            </View>
        );
    }

    const removeItem = async (productId) => {
        if (!productId) return;
        await dispatch(toggleWishlistProduct(productId));
        load();
    };

    const filteredItems = useMemo(() => {
        const q = String(search || "").trim().toLowerCase();
        if (!q) return items;
        return items.filter((row) => {
            const product = row.product || {};
            const name = String(product.name || row.lastKnown?.name || "").toLowerCase();
            const brand = String(product.brand || "").toLowerCase();
            return name.includes(q) || brand.includes(q);
        });
    }, [items, search]);

    const getRowKey = useCallback((item, index) => {
        const product = item?.product || {};
        return String(item?.id || item?.productId || product?.id || product?._id || index);
    }, []);

    useEffect(() => {
        autoDeletedRef.current = {};
    }, [filteredItems]);

    const renderHeader = () => (
        <View style={styles.topWrap}>
            <AppPageHeader />

            <View style={styles.searchWrap}>
                <Ionicons name="search-outline" size={22} color="#666" />
                <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search your wishlist product"
                    placeholderTextColor="#b7b7b7"
                    style={styles.searchInput}
                />
            </View>
        </View>
    );

    const renderItem = ({ item }) => {
        const product = item.product || {};
        const removed = item.isRemoved === true;
        const productId = product.id || product._id || item.productId || "";
        const stockCount = Number(product.countInStock || 0);
        const soldCount = Number(product.soldCount || 0);
        const rating = Number(product.rating || 0);

        return (
            <View style={styles.rowContainer}>
                <TouchableOpacity
                    style={[styles.card, removed && styles.cardRemoved]}
                    activeOpacity={0.9}
                    onPress={() => {
                        if (!removed) {
                            navigation.navigate("Home", { screen: "Product Detail", params: { item: { ...product, id: productId } } });
                        }
                    }}
                >
                    <Image source={{ uri: product.image || FALLBACK_IMAGE }} style={styles.image} />
                    <View style={styles.body}>
                        <View style={styles.topRow}>
                            <View style={styles.titleWrap}>
                                <Ionicons name="cube-outline" size={24} color="#8a5a2b" style={styles.titleIcon} />
                                <Text numberOfLines={1} style={styles.name}>{product.name || "Removed product"}</Text>
                            </View>
                            {!removed ? (
                                <TouchableOpacity style={styles.removeBtn} onPress={() => removeItem(productId)}>
                                    <Ionicons name="heart" size={28} color="#d62027" />
                                </TouchableOpacity>
                            ) : null}
                        </View>
                        <Text numberOfLines={1} style={styles.descText}>
                            {String(product.description || product.brand || "Product description")}
                        </Text>
                        {!removed ? (
                            <View style={styles.ratingRow}>
                                <Ionicons name="star" size={18} color="#111" />
                                <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                                <Text style={styles.soldText}>({soldCount} Sold)</Text>
                            </View>
                        ) : null}

                        {removed ? (
                            <Text style={styles.removedText}>No longer available</Text>
                        ) : (
                            <View style={styles.bottomRow}>
                                <View style={styles.statRow}>
                                    <Text style={styles.statLabel}>Stock</Text>
                                    <Text style={styles.statValue}>{stockCount}</Text>
                                </View>

                                <View style={styles.priceCol}>
                                    <Text style={styles.priceLabel}>Price</Text>
                                    <Text style={styles.price}>$ {Number(product.price || 0).toFixed(2)}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    const renderHiddenItem = ({ item }) => {
        const product = item.product || {};
        const productId = product.id || product._id || item.productId || "";

        return (
            <View style={styles.rowContainer}>
                <View style={styles.hiddenRow}>
                    <TouchableOpacity style={styles.deleteSwipeBtn} onPress={() => removeItem(productId)}>
                        <Ionicons name="trash" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const handleSwipeValueChange = ({ key, value }) => {
        if (value > -146 || autoDeletedRef.current[key]) return;
        const matched = filteredItems.find((entry, index) => getRowKey(entry, index) === key);
        if (!matched) return;

        const product = matched.product || {};
        const productId = product.id || product._id || matched.productId || "";
        if (!productId) return;

        autoDeletedRef.current[key] = true;
        removeItem(productId);
    };

    if (!items.length && !loading) {
        return (
            <SwipeListView
                style={styles.container}
                data={[]}
                keyExtractor={(_, i) => String(i)}
                ListHeaderComponent={renderHeader}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <Ionicons name="heart-circle-outline" size={64} color="#777" />
                        <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
                        <Text style={styles.emptySub}>Tap the heart button on products to save them.</Text>
                    </View>
                }
            />
        );
    }

    return (
        <SwipeListView
            style={styles.container}
            data={filteredItems}
            keyExtractor={getRowKey}
            renderItem={renderItem}
            renderHiddenItem={renderHiddenItem}
            rightOpenValue={-150}
            disableRightSwipe
            onSwipeValueChange={handleSwipeValueChange}
            ListHeaderComponent={renderHeader}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
            contentContainerStyle={styles.listContent}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f7f7f7",
    },
    topWrap: {
        paddingTop: 0,
        paddingHorizontal: 14,
        paddingBottom: 10,
    },
    searchWrap: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#ededed",
        paddingHorizontal: 16,
        height: 52,
        marginBottom: 8,
    },
    searchInput: {
        marginLeft: 10,
        flex: 1,
        color: "#222",
        fontSize: 16,
    },
    rowContainer: {
        height: 134,
        marginHorizontal: 14,
        marginBottom: 12,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 8,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#dcdcdc",
        height: "100%",
    },
    listContent: {
        paddingBottom: 30,
    },
    cardRemoved: {
        opacity: 0.7,
    },
    image: {
        width: 112,
        height: 112,
        borderRadius: 16,
        backgroundColor: "#f2f2f2",
        marginRight: 12,
    },
    body: {
        flex: 1,
        justifyContent: "center",
    },
    topRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 2,
    },
    titleWrap: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        marginRight: 8,
    },
    titleIcon: {
        marginRight: 6,
    },
    name: {
        fontSize: 17,
        fontWeight: "800",
        color: "#111",
    },
    descText: {
        fontSize: 12,
        color: "#404040",
        marginBottom: 4,
    },
    ratingRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
    },
    ratingText: {
        marginLeft: 6,
        fontSize: 14,
        fontWeight: "800",
        color: "#111",
    },
    soldText: {
        marginLeft: 6,
        fontSize: 12,
        color: "#303030",
    },
    bottomRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
    },
    statRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    statLabel: {
        fontSize: 14,
        fontWeight: "800",
        color: "#111",
        minWidth: 48,
    },
    statValue: {
        fontSize: 16,
        color: "#111",
    },
    priceCol: {
        alignItems: "flex-end",
        marginLeft: 10,
    },
    priceLabel: {
        fontSize: 12,
        color: "#2f2f2f",
        marginBottom: 2,
    },
    price: {
        color: "#111",
        fontSize: 20,
        fontWeight: "800",
    },
    removedText: {
        color: "#b00020",
        fontWeight: "600",
        marginTop: 8,
    },
    removeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    hiddenRow: {
        flex: 1,
        alignItems: "flex-end",
        justifyContent: "center",
        borderRadius: 24,
        overflow: "hidden",
        paddingRight: 1,
    },
    deleteSwipeBtn: {
        width: 112,
        height: 104,
        borderRadius: 16,
        backgroundColor: "#101010",
        alignItems: "flex-end",
        justifyContent: "center",
        paddingRight: 18,
    },
    emptyWrap: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 70,
        paddingHorizontal: 30,
    },
    emptyTitle: {
        marginTop: 10,
        color: "#222",
        fontSize: 18,
        fontWeight: "700",
    },
    emptySub: {
        marginTop: 6,
        color: "#666",
        textAlign: "center",
    },
});

export default Wishlist;
