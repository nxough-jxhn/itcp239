import React, { useEffect, useMemo, useState, useContext } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    TextInput,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import mime from "mime";
import Toast from "react-native-toast-message";
import baseURL from "../../assets/common/baseurl";
import { getJwtToken } from "../../assets/common/authToken";
import AuthGlobal from "../../Context/Store/AuthGlobal";

const MAX_IMAGES = 3;

const LeaveReview = ({ route, navigation }) => {
    const context = useContext(AuthGlobal);
    const isAdmin = context?.stateUser?.user?.isAdmin === true;
    const { orderId, productId, productName, preloadedReview } = route.params || {};
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [existingReview, setExistingReview] = useState(null);
    const [existingImages, setExistingImages] = useState([]);
    const [pickedImages, setPickedImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const totalMediaCount = existingImages.length + pickedImages.length;

    const canSubmit = useMemo(() => {
        return Number(rating) >= 1 && Number(rating) <= 5 && String(comment || "").trim().length > 0;
    }, [rating, comment]);

    useEffect(() => {
        let isMounted = true;

        const loadExisting = async () => {
            if (preloadedReview) {
                const review = preloadedReview;
                setExistingReview(review);
                setRating(Number(review.rating || 5));
                setComment(review.comment || "");
                setExistingImages(Array.isArray(review.images) ? review.images : []);
                setLoading(false);
                return;
            }

            if (!productId || !orderId) {
                setLoading(false);
                return;
            }

            try {
                const jwt = await getJwtToken();
                const response = await axios.get(`${baseURL}products/${productId}/reviews/me`, {
                    headers: { Authorization: `Bearer ${jwt || ""}` },
                    params: { orderId },
                });

                if (!isMounted) return;
                const review = response.data?.review || null;
                setExistingReview(review);
                if (review) {
                    setRating(Number(review.rating || 5));
                    setComment(review.comment || "");
                    setExistingImages(Array.isArray(review.images) ? review.images : []);
                }
            } catch (_error) {
                if (isMounted) {
                    Toast.show({ topOffset: 60, type: "error", text1: "Failed to load review data" });
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadExisting();

        return () => {
            isMounted = false;
        };
    }, [orderId, productId, preloadedReview]);

    const pickImages = async () => {
        const remain = MAX_IMAGES - totalMediaCount;
        if (remain <= 0) {
            Toast.show({ topOffset: 60, type: "error", text1: `Max ${MAX_IMAGES} images only` });
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsMultipleSelection: true,
            quality: 0.9,
            selectionLimit: remain,
        });

        if (result.canceled) return;

        const selectedUris = (result.assets || []).map((asset) => asset.uri).filter(Boolean);
        if (!selectedUris.length) return;

        const capped = selectedUris.slice(0, remain);
        setPickedImages((prev) => [...prev, ...capped]);
    };

    const removePickedImage = (uri) => {
        setPickedImages((prev) => prev.filter((img) => img !== uri));
    };

    const removeExistingImage = (uri) => {
        setExistingImages((prev) => prev.filter((img) => img !== uri));
    };

    const appendImageFile = (formData, uri) => {
        const cleanUri = uri.startsWith("file://") ? uri : `file://${uri}`;
        formData.append("images", {
            uri: cleanUri,
            type: mime.getType(cleanUri) || "image/jpeg",
            name: cleanUri.split("/").pop() || `review-${Date.now()}.jpg`,
        });
    };

    const submit = async () => {
        if (saving || !canSubmit) return;

        try {
            setSaving(true);
            const jwt = await getJwtToken();

            const formData = new FormData();
            formData.append("rating", String(rating));
            formData.append("comment", String(comment || "").trim());
            if (orderId) {
                formData.append("orderId", String(orderId));
            }
            formData.append("existingImages", JSON.stringify(existingImages));

            pickedImages.forEach((uri) => appendImageFile(formData, uri));

            const config = {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${jwt || ""}`,
                },
            };

            if (existingReview?.id || existingReview?._id) {
                const reviewId = existingReview.id || existingReview._id;
                await axios.put(`${baseURL}products/${productId}/reviews/${reviewId}`, formData, config);
                Toast.show({ topOffset: 60, type: "success", text1: "Review updated" });
            } else {
                if (!orderId) {
                    Toast.show({ topOffset: 60, type: "error", text1: "Missing order reference for new review" });
                    return;
                }
                await axios.post(`${baseURL}products/${productId}/reviews`, formData, config);
                Toast.show({ topOffset: 60, type: "success", text1: "Review submitted" });
            }

            setTimeout(() => navigation.goBack(), 400);
        } catch (error) {
            const msg = error?.response?.data?.message || "Failed to submit review";
            Toast.show({ topOffset: 60, type: "error", text1: msg });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="small" color="#111" />
                <Text style={styles.loadingText}>Loading review form...</Text>
            </View>
        );
    }

    if (isAdmin) {
        return (
            <View style={styles.center}>
                <Text style={styles.title}>Customer-only page</Text>
                <Text style={styles.loadingText}>Admins cannot submit or edit reviews.</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>{existingReview ? "Edit Review" : "Leave a Review"}</Text>
            <Text style={styles.subtitle}>{productName || "Product"}</Text>

            <View style={styles.field}>
                <Text style={styles.label}>Rating</Text>
                <View style={styles.pickerWrap}>
                    <Picker
                        selectedValue={rating}
                        onValueChange={(value) => setRating(Number(value))}
                        style={styles.picker}
                        itemStyle={styles.pickerItem}
                        dropdownIconColor="#111"
                    >
                        {[5, 4, 3, 2, 1].map((star) => (
                            <Picker.Item key={star} label={`${star} star${star > 1 ? "s" : ""}`} value={star} />
                        ))}
                    </Picker>
                </View>
                <Text style={styles.ratingPreview}>Selected: {Number(rating || 0)} star{Number(rating || 0) > 1 ? "s" : ""}</Text>
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>Review</Text>
                <TextInput
                    style={styles.commentInput}
                    placeholder="Write your review here"
                    value={comment}
                    onChangeText={setComment}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                />
            </View>

            <View style={styles.field}>
                <View style={styles.mediaHeader}>
                    <Text style={styles.label}>Media ({totalMediaCount}/{MAX_IMAGES})</Text>
                    <TouchableOpacity style={styles.addBtn} onPress={pickImages}>
                        <Text style={styles.addBtnText}>+ Add Images</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {existingImages.map((uri) => (
                        <View key={`existing-${uri}`} style={styles.imageItem}>
                            <Image source={{ uri }} style={styles.image} />
                            <TouchableOpacity style={styles.removeBtn} onPress={() => removeExistingImage(uri)}>
                                <Text style={styles.removeBtnText}>x</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                    {pickedImages.map((uri) => (
                        <View key={`picked-${uri}`} style={styles.imageItem}>
                            <Image source={{ uri }} style={styles.image} />
                            <TouchableOpacity style={styles.removeBtn} onPress={() => removePickedImage(uri)}>
                                <Text style={styles.removeBtnText}>x</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </ScrollView>
            </View>

            <TouchableOpacity
                style={[styles.submitBtn, (!canSubmit || saving) && styles.submitBtnDisabled]}
                disabled={!canSubmit || saving}
                onPress={submit}
            >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save Review</Text>}
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f3f3f3" },
    content: { padding: 14, paddingBottom: 34 },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
    loadingText: { marginTop: 8, color: "#555", fontSize: 12 },
    title: { fontSize: 18, fontWeight: "700", color: "#161616" },
    subtitle: { marginTop: 3, color: "#5e5e5e", marginBottom: 12, fontSize: 12 },
    field: {
        marginBottom: 12,
        backgroundColor: "#fff",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#dedede",
        padding: 10,
    },
    label: { fontSize: 12, fontWeight: "700", color: "#1d1d1d", marginBottom: 6 },
    pickerWrap: { backgroundColor: "#fff", borderRadius: 9, borderWidth: 1, borderColor: "#d8d8d8" },
    picker: {
        color: "#111",
        height: 52,
    },
    pickerItem: {
        color: "#111",
    },
    ratingPreview: {
        marginTop: 6,
        color: "#4a4a4a",
        fontSize: 12,
        fontWeight: "600",
    },
    commentInput: {
        minHeight: 92,
        backgroundColor: "#fff",
        borderRadius: 9,
        borderWidth: 1,
        borderColor: "#d8d8d8",
        paddingHorizontal: 10,
        paddingVertical: 9,
        color: "#111",
        fontSize: 13,
        lineHeight: 18,
    },
    mediaHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    addBtn: { backgroundColor: "#111", borderRadius: 8, paddingVertical: 7, paddingHorizontal: 10 },
    addBtnText: { color: "#fff", fontWeight: "600", fontSize: 12 },
    imageItem: { marginRight: 10, position: "relative" },
    image: { width: 82, height: 82, borderRadius: 9, backgroundColor: "#ddd" },
    removeBtn: {
        position: "absolute",
        top: -8,
        right: -8,
        width: 21,
        height: 21,
        borderRadius: 10.5,
        backgroundColor: "#111",
        justifyContent: "center",
        alignItems: "center",
    },
    removeBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
    submitBtn: {
        backgroundColor: "#111",
        borderRadius: 10,
        height: 44,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 4,
    },
    submitBtnDisabled: { backgroundColor: "#777" },
    submitText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});

export default LeaveReview;
