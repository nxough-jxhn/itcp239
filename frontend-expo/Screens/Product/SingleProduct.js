import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
    View,
    StyleSheet,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    RefreshControl,
    Modal,
    FlatList,
    Dimensions,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { useNavigation } from "@react-navigation/native";
import { addToCart } from "../../Redux/Actions/cartActions";
import { fetchProductById } from "../../Redux/Actions/productActions";
import { fetchReviewsByProduct } from "../../Redux/Actions/reviewActions";
import { toggleWishlistProduct, fetchWishlistIds } from "../../Redux/Actions/wishlistActions";
import { sanitizeProfanity } from "../../assets/common/profanityFilter";
import { getProductPricing } from "../../assets/common/productPricing";
import AuthGlobal from "../../Context/Store/AuthGlobal";

const FALLBACK_IMAGE = "https://cdn.pixabay.com/photo/2012/04/01/17/29/box-23649_960_720.png";
const EMPTY_PRODUCT = {};
const EMPTY_REVIEWS = [];
const SCREEN_WIDTH = Dimensions.get("window").width;

const getBrandInitials = (brand) => {
    const clean = String(brand || "").trim();
    if (!clean) return "P";
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
};

const renderStars = (rating) => {
    const rounded = Math.max(0, Math.min(5, Math.round(Number(rating || 0))));
    return "★".repeat(rounded) + "☆".repeat(5 - rounded);
};

const SingleProduct = ({ route }) => {
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const context = useContext(AuthGlobal);
    const isAdmin = context?.stateUser?.user?.isAdmin === true;
    const currentUserId = String(context?.stateUser?.user?.userId || "");

    const [item] = useState(route.params?.item || {});
    const [sortBy, setSortBy] = useState("date_desc");
    const [ratingFilter, setRatingFilter] = useState(0);
    const [withMedia, setWithMedia] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    const [mediaModalVisible, setMediaModalVisible] = useState(false);
    const [mediaModalImages, setMediaModalImages] = useState([]);
    const [mediaModalIndex, setMediaModalIndex] = useState(0);
    const modalPagerRef = useRef(null);

    const productId = useMemo(() => item?.id || item?._id, [item]);

    const product = useSelector((state) => {
        const key = String(productId || "");
        return state.products?.detailsById?.[key] || item || EMPTY_PRODUCT;
    });

    const reviews = useSelector((state) => {
        const key = String(productId || "");
        return state.reviews?.byProductId?.[key] || EMPTY_REVIEWS;
    });
    const productLoading = useSelector((state) => state.products?.loadingDetails === true);
    const productError = useSelector((state) => state.products?.error || "");
    const reviewsLoading = useSelector((state) => state.reviews?.loadingByProductId?.[String(productId || "")] === true);
    const reviewsError = useSelector((state) => state.reviews?.errorByProductId?.[String(productId || "")] || "");

    const wishlistIds = useSelector((state) => state.wishlist?.ids || []);
    const isWishlisted = wishlistIds.includes(String(productId || ""));

    const pricing = getProductPricing(product);
    const originalPrice = pricing.originalPrice;
    const displayPrice = pricing.displayPrice > 0 ? pricing.displayPrice : pricing.originalPrice;

    const galleryImages = useMemo(() => {
        const images = [];

        if (Array.isArray(product?.images)) {
            product.images.forEach((uri) => {
                const clean = String(uri || "").trim();
                if (clean) images.push(clean);
            });
        }

        const main = String(product?.image || "").trim();
        if (main && !images.includes(main)) {
            images.unshift(main);
        }

        if (images.length === 0) images.push(FALLBACK_IMAGE);
        return images;
    }, [product]);

    useEffect(() => {
        setActiveImageIndex(0);
    }, [galleryImages]);

    useEffect(() => {
        if (!productId) return;
        dispatch(fetchProductById(productId));
        dispatch(fetchWishlistIds());
    }, [productId, dispatch]);

    useEffect(() => {
        if (!productId) return;

        dispatch(
            fetchReviewsByProduct({
                productId,
                sort: sortBy,
                rating: ratingFilter,
                withMedia,
            })
        );
    }, [productId, sortBy, ratingFilter, withMedia, dispatch]);

    const onRefresh = async () => {
        if (!productId) return;
        setRefreshing(true);
        try {
            await Promise.all([
                dispatch(fetchProductById(productId)),
                dispatch(
                    fetchReviewsByProduct({
                        productId,
                        sort: sortBy,
                        rating: ratingFilter,
                        withMedia,
                    })
                ),
            ]);
        } catch (_error) {
            Toast.show({ topOffset: 60, type: "error", text1: "Could not refresh. Check your internet connection." });
        } finally {
            setRefreshing(false);
        }
    };

    const onToggleWishlist = async () => {
        if (!productId) return;
        const result = await dispatch(toggleWishlistProduct(productId));
        if (result?.authRequired) {
            navigation.navigate("User", { screen: "Login" });
            return;
        }
        if (!result?.ok) {
            Toast.show({ topOffset: 60, type: "error", text1: result?.message || "Wishlist update failed" });
            return;
        }
        Toast.show({
            topOffset: 60,
            type: "success",
            text1: result.wishlisted ? "Added to wishlist" : "Removed from wishlist",
        });
    };

    const onAddToCart = () => {
        const inStock = Number(product?.countInStock || 0);
        if (inStock <= 0) {
            Toast.show({ topOffset: 60, type: "error", text1: "This product is currently unavailable" });
            return;
        }

        dispatch(
            addToCart({
                ...product,
                id: product?.id || product?._id || item?.id || item?._id,
                quantity: 1,
                price: displayPrice,
                originalPrice,
            })
        );
        Toast.show({
            topOffset: 60,
            type: "success",
            text1: `${product?.name || "Product"} added to Cart`,
        });
    };

    const openMediaModal = (images, startIndex = 0) => {
        const list = Array.isArray(images) ? images.filter(Boolean) : [];
        if (!list.length) return;

        const safeIndex = Math.max(0, Math.min(list.length - 1, Number(startIndex || 0)));
        setMediaModalImages(list);
        setMediaModalIndex(safeIndex);
        setMediaModalVisible(true);

        setTimeout(() => {
            if (modalPagerRef.current) {
                modalPagerRef.current.scrollToIndex({ index: safeIndex, animated: false });
            }
        }, 40);
    };

    const closeMediaModal = () => {
        setMediaModalVisible(false);
    };

    const selectedImage = galleryImages[activeImageIndex] || galleryImages[0] || FALLBACK_IMAGE;

    return (
        <View style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={[
                        styles.thumbScrollContent,
                        galleryImages.length <= 1 && styles.thumbScrollCentered,
                    ]}
                >
                    {galleryImages.map((uri, index) => {
                        const isActive = index === activeImageIndex;
                        return (
                            <TouchableOpacity
                                key={`${uri}-${index}`}
                                style={styles.thumbTap}
                                activeOpacity={0.9}
                                onPress={() => setActiveImageIndex(index)}
                            >
                                <Image
                                    source={{ uri: uri || FALLBACK_IMAGE }}
                                    style={[styles.thumbImage, !isActive && styles.thumbImageDim]}
                                    resizeMode="cover"
                                />
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <View style={styles.mainImageWrap}>
                    <Image source={{ uri: selectedImage }} style={styles.mainImage} resizeMode="cover" />
                </View>

                <View style={styles.detailCard}>
                    <View style={styles.brandRow}>
                        <View style={styles.brandAvatar}>
                            <Text style={styles.brandAvatarText}>{getBrandInitials(product?.brand)}</Text>
                        </View>
                        <View style={styles.brandTextWrap}>
                            <Text style={styles.brandName}>{product?.brand || "brand name"}</Text>
                            <Text style={styles.brandHandle}>@{String(product?.brand || "brand").toLowerCase()}_official</Text>
                        </View>
                        {!isAdmin ? (
                            <TouchableOpacity style={styles.wishBtn} onPress={onToggleWishlist}>
                                <Ionicons name={isWishlisted ? "heart" : "heart-outline"} size={24} color={isWishlisted ? "#111" : "#111"} />
                            </TouchableOpacity>
                        ) : null}
                    </View>

                    <View style={styles.nameRow}>
                        <Text style={styles.productName}>{product?.name || "Product Name"}</Text>
                        <Text style={styles.categoryLabel}>Category</Text>
                    </View>

                    {productLoading ? <Text style={styles.loadingInlineText}>Loading product details...</Text> : null}
                    {!productLoading && productError ? <Text style={styles.reduxErrorText}>Failed to load product details.</Text> : null}

                    <View style={styles.priceStockRow}>
                        <View style={styles.ratingWrap}>
                            <Text style={styles.ratingStars}>★★★★☆</Text>
                            <Text style={styles.ratingNumber}>{Number(product?.rating || 0).toFixed(1)}</Text>
                        </View>
                        <View style={styles.stockPriceRight}>
                            <Text style={styles.stockText}>Stock {Number(product?.countInStock || 0)}</Text>
                            {pricing.isSale ? <Text style={styles.oldPriceMain}>${pricing.originalPrice.toFixed(2)}</Text> : null}
                            <Text style={styles.priceMain}>${displayPrice.toFixed(2)}</Text>
                            {pricing.isSale ? (
                                <Text style={styles.salePill}>{pricing.percentOff > 0 ? `${pricing.percentOff}% OFF` : "SALE"}</Text>
                            ) : null}
                        </View>
                    </View>

                    <Text style={styles.description}>{product?.description || "product description"}</Text>

                    {!isAdmin ? (
                        <TouchableOpacity
                            style={[styles.cartButton, Number(product?.countInStock || 0) <= 0 && styles.cartButtonDisabled]}
                            onPress={onAddToCart}
                        >
                            <Text style={styles.cartButtonText}>
                                {Number(product?.countInStock || 0) <= 0 ? "Unavailable" : "Add to Cart"}
                            </Text>
                        </TouchableOpacity>
                    ) : null}
                </View>

                <View style={styles.reviewsSection}>
                    <Text style={styles.reviewsTitle}>Reviews</Text>

                    <View style={styles.filterRowTop}>
                        <TouchableOpacity
                            style={[styles.filterChip, sortBy === "date_desc" && styles.filterChipActive]}
                            onPress={() => setSortBy("date_desc")}
                        >
                            <Text style={[styles.filterChipText, sortBy === "date_desc" && styles.filterChipTextActive]}>Newest</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.filterChip, sortBy === "date_asc" && styles.filterChipActive]}
                            onPress={() => setSortBy("date_asc")}
                        >
                            <Text style={[styles.filterChipText, sortBy === "date_asc" && styles.filterChipTextActive]}>Oldest</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.filterChip, withMedia && styles.filterChipActive]}
                            onPress={() => setWithMedia((prev) => !prev)}
                        >
                            <Text style={[styles.filterChipText, withMedia && styles.filterChipTextActive]}>With Media</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRowBottom}>
                        {[0, 5, 4, 3, 2, 1].map((value) => (
                            <TouchableOpacity
                                key={value}
                                style={[styles.starChip, ratingFilter === value && styles.starChipActive]}
                                onPress={() => setRatingFilter(value)}
                            >
                                <Text style={[styles.starChipText, ratingFilter === value && styles.starChipTextActive]}>
                                    {value === 0 ? "All" : `${value}★`}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View style={styles.reviewDivider} />

                    {reviewsLoading ? (
                        <Text style={styles.emptyReviews}>Loading reviews...</Text>
                    ) : reviewsError ? (
                        <Text style={styles.reduxErrorText}>Failed to load reviews. Pull down to retry.</Text>
                    ) : reviews.length === 0 ? (
                        <Text style={styles.emptyReviews}>No reviews yet for selected filters.</Text>
                    ) : (
                        reviews.map((review) => {
                            const media = Array.isArray(review?.images) ? review.images.filter(Boolean) : [];
                            const hasMedia = media.length > 0;
                            const reviewUserId = String(review?.user?.id || review?.user?._id || review?.user || "");
                            const canEditReview = !isAdmin && currentUserId && reviewUserId && currentUserId === reviewUserId;

                            return (
                                <View key={review.id || review._id} style={styles.reviewEchoWrap}>
                                    <View style={styles.reviewCard}>
                                        <View style={styles.reviewLeft}>
                                            <View style={styles.reviewHeaderRow}>
                                                <View style={styles.reviewAuthorRow}>
                                                    <Text style={styles.reviewAuthor}>{review?.user?.name || "Customer Name"}</Text>
                                                    {canEditReview ? (
                                                        <TouchableOpacity
                                                            style={styles.reviewEditBtn}
                                                            onPress={() => {
                                                                navigation.navigate("Leave Review", {
                                                                    productId,
                                                                    productName: product?.name || item?.name,
                                                                    orderId: review?.order,
                                                                    preloadedReview: {
                                                                        ...review,
                                                                        id: review?.id || review?._id,
                                                                    },
                                                                });
                                                            }}
                                                        >
                                                            <Ionicons name="create-outline" size={15} color="#111" />
                                                        </TouchableOpacity>
                                                    ) : null}
                                                </View>
                                                <Text style={styles.reviewDate}>{String(review?.createdAt || "").split("T")[0]}</Text>
                                            </View>

                                            <View style={styles.reviewRatingRow}>
                                                <Text style={styles.reviewStars}>{renderStars(review?.rating)}</Text>
                                                <Text style={styles.reviewRatingValue}>{Number(review?.rating || 0).toFixed(1)}</Text>
                                            </View>

                                            <Text style={styles.reviewComment} numberOfLines={3}>
                                                {sanitizeProfanity(review?.comment || "review text")}
                                            </Text>
                                        </View>

                                        {hasMedia ? (
                                            <View style={styles.reviewMediaPane}>
                                                <FlatList
                                                    data={media}
                                                    horizontal
                                                    pagingEnabled
                                                    keyExtractor={(uri, idx) => `${uri}-${idx}`}
                                                    showsHorizontalScrollIndicator={false}
                                                    renderItem={({ item: uri, index }) => (
                                                        <TouchableOpacity onPress={() => openMediaModal(media, index)} activeOpacity={0.9}>
                                                            <Image source={{ uri }} style={styles.reviewImage} resizeMode="cover" />
                                                        </TouchableOpacity>
                                                    )}
                                                />
                                            </View>
                                        ) : null}
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>

            <Modal visible={mediaModalVisible} transparent animationType="fade" onRequestClose={closeMediaModal}>
                <View style={styles.modalBackdrop}>
                    <TouchableOpacity style={styles.modalCloseBtn} onPress={closeMediaModal}>
                        <Ionicons name="close" size={26} color="#fff" />
                    </TouchableOpacity>

                    <FlatList
                        ref={modalPagerRef}
                        data={mediaModalImages}
                        horizontal
                        pagingEnabled
                        keyExtractor={(uri, idx) => `${uri}-modal-${idx}`}
                        initialScrollIndex={mediaModalIndex}
                        getItemLayout={(_data, index) => ({
                            length: SCREEN_WIDTH,
                            offset: SCREEN_WIDTH * index,
                            index,
                        })}
                        onMomentumScrollEnd={(event) => {
                            const x = Number(event?.nativeEvent?.contentOffset?.x || 0);
                            setMediaModalIndex(Math.round(x / SCREEN_WIDTH));
                        }}
                        renderItem={({ item: uri }) => (
                            <View style={styles.modalSlide}>
                                <Image source={{ uri }} style={styles.modalImage} resizeMode="contain" />
                            </View>
                        )}
                    />

                    <Text style={styles.modalCounter}>
                        {mediaModalImages.length ? `${mediaModalIndex + 1} / ${mediaModalImages.length}` : ""}
                    </Text>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f2f2f2",
    },
    scrollContent: {
        paddingBottom: 24,
    },
    thumbScrollContent: {
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 8,
        minWidth: "100%",
        flexDirection: "row",
    },
    thumbScrollCentered: {
        justifyContent: "center",
    },
    thumbTap: {
        marginHorizontal: 6,
    },
    thumbImage: {
        width: 74,
        height: 74,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#d8d8d8",
        opacity: 1,
    },
    thumbImageDim: {
        opacity: 0.45,
    },
    mainImageWrap: {
        marginHorizontal: 12,
        borderRadius: 18,
        overflow: "hidden",
        backgroundColor: "#fff",
    },
    mainImage: {
        width: "100%",
        height: 240,
        backgroundColor: "#ececec",
    },
    detailCard: {
        marginHorizontal: 12,
        marginTop: 10,
        backgroundColor: "#fff",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#e2e2e2",
        padding: 11,
    },
    brandRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    brandAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: "#a46e43",
        alignItems: "center",
        justifyContent: "center",
    },
    brandAvatarText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 12,
    },
    brandTextWrap: {
        marginLeft: 10,
        flex: 1,
    },
    brandName: {
        fontSize: 12,
        fontWeight: "700",
        color: "#111",
    },
    brandHandle: {
        marginTop: 1,
        fontSize: 11,
        color: "#666",
    },
    wishBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
    },
    nameRow: {
        marginTop: 8,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
    },
    productName: {
        flex: 1,
        fontSize: 15,
        lineHeight: 20,
        color: "#111",
        fontWeight: "800",
        fontFamily: "serif",
        marginRight: 8,
    },
    categoryLabel: {
        fontSize: 12,
        color: "#111",
        fontStyle: "italic",
        fontWeight: "600",
    },
    priceStockRow: {
        marginTop: 5,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    ratingWrap: {
        flexDirection: "row",
        alignItems: "center",
    },
    ratingStars: {
        fontSize: 16,
        color: "#f5b200",
        marginRight: 5,
    },
    ratingNumber: {
        fontSize: 14,
        fontWeight: "700",
        color: "#444",
    },
    stockPriceRight: {
        alignItems: "flex-end",
    },
    stockText: {
        fontSize: 12,
        color: "#333",
        marginBottom: 2,
    },
    priceMain: {
        fontSize: 24,
        lineHeight: 28,
        color: "#111",
        fontWeight: "800",
        fontFamily: "serif",
    },
    oldPriceMain: {
        fontSize: 12,
        color: "#727272",
        textDecorationLine: "line-through",
        marginBottom: 1,
    },
    salePill: {
        marginTop: 4,
        alignSelf: "flex-end",
        backgroundColor: "#111",
        color: "#fff",
        fontSize: 10,
        fontWeight: "800",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        overflow: "hidden",
    },
    description: {
        marginTop: 6,
        fontSize: 12,
        lineHeight: 17,
        color: "#333",
    },
    loadingInlineText: {
        marginTop: 6,
        color: "#555",
        fontSize: 12,
        fontWeight: "600",
    },
    reduxErrorText: {
        marginTop: 6,
        color: "#b02020",
        fontSize: 12,
        fontWeight: "700",
    },
    cartButton: {
        marginTop: 9,
        height: 48,
        borderRadius: 14,
        backgroundColor: "#0f0f0f",
        alignItems: "center",
        justifyContent: "center",
    },
    cartButtonDisabled: {
        backgroundColor: "#9a9a9a",
    },
    cartButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
    reviewsSection: {
        marginTop: 14,
        paddingHorizontal: 12,
    },
    reviewsTitle: {
        fontSize: 18,
        color: "#111",
        fontWeight: "800",
        marginBottom: 6,
    },
    filterRowTop: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    filterChip: {
        minHeight: 36,
        minWidth: 96,
        borderRadius: 18,
        backgroundColor: "#979fa1",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 12,
    },
    filterChipActive: {
        backgroundColor: "#0b0b0b",
    },
    filterChipText: {
        color: "#111",
        fontSize: 14,
        fontWeight: "700",
    },
    filterChipTextActive: {
        color: "#fff",
    },
    filterRowBottom: {
        paddingBottom: 8,
    },
    starChip: {
        minHeight: 34,
        minWidth: 64,
        borderRadius: 17,
        borderWidth: 1,
        borderColor: "#cdcdcd",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 10,
        backgroundColor: "#fff",
        marginRight: 8,
    },
    starChipActive: {
        backgroundColor: "#111",
        borderColor: "#111",
    },
    starChipText: {
        color: "#444",
        fontSize: 13,
        fontWeight: "700",
    },
    starChipTextActive: {
        color: "#fff",
    },
    reviewDivider: {
        borderBottomWidth: 1,
        borderBottomColor: "rgba(0,0,0,0.1)",
        marginBottom: 10,
    },
    reviewEchoWrap: {
        borderRadius: 24,
        backgroundColor: "rgba(90,90,90,0.6)",
        paddingRight: 7,
        paddingBottom: 7,
        marginBottom: 10,
    },
    reviewCard: {
        backgroundColor: "#fff",
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "#d8d8d8",
        padding: 10,
        flexDirection: "row",
        justifyContent: "space-between",
    },
    reviewLeft: {
        flex: 1,
        marginRight: 10,
    },
    reviewHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 4,
    },
    reviewAuthorRow: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        marginRight: 8,
    },
    reviewAuthor: {
        fontSize: 15,
        color: "#111",
        fontWeight: "700",
    },
    reviewEditBtn: {
        marginLeft: 8,
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#d2d2d2",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fff",
    },
    reviewDate: {
        fontSize: 11,
        color: "#444",
        fontWeight: "600",
        flexShrink: 0,
    },
    reviewRatingRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
    },
    reviewStars: {
        fontSize: 18,
        color: "#f5b200",
        marginRight: 6,
    },
    reviewRatingValue: {
        fontSize: 15,
        color: "#4a4a4a",
        fontWeight: "700",
    },
    reviewComment: {
        color: "#2f2f2f",
        fontSize: 14,
    },
    reviewMediaPane: {
        width: 108,
        height: 96,
        borderRadius: 8,
        overflow: "hidden",
        alignSelf: "center",
    },
    reviewImage: {
        width: 108,
        height: 96,
        borderRadius: 8,
        backgroundColor: "#eee",
    },
    emptyReviews: {
        paddingVertical: 14,
        color: "#666",
        textAlign: "center",
        fontSize: 14,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.92)",
        justifyContent: "center",
    },
    modalCloseBtn: {
        position: "absolute",
        top: 50,
        right: 18,
        zIndex: 10,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.18)",
        alignItems: "center",
        justifyContent: "center",
    },
    modalSlide: {
        width: SCREEN_WIDTH,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 14,
    },
    modalImage: {
        width: "100%",
        height: 420,
    },
    modalCounter: {
        alignSelf: "center",
        color: "#fff",
        marginTop: 10,
        fontSize: 13,
        fontWeight: "600",
    },
});

export default SingleProduct;
