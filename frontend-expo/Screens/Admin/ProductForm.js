import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    Platform,
    ActivityIndicator,
    ScrollView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import Toast from "react-native-toast-message";
import baseURL from "../../assets/common/baseurl";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import mime from "mime";
import { Ionicons } from "@expo/vector-icons";
import { getJwtToken } from "../../assets/common/authToken";
import AppPageHeader from "../../Shared/AppPageHeader";
import Input from "../../Shared/Input";

const FALLBACK_IMAGE = "https://cdn.pixabay.com/photo/2012/04/01/17/29/box-23649_960_720.png";
const MAX_PRODUCT_IMAGES = 8;
const PICKER_IMAGE_QUALITY = 0.35;

const ProductForm = (props) => {
    const [pickerValue, setPickerValue] = useState("");
    const [brand, setBrand] = useState("");
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [description, setDescription] = useState("");
    const [imageUris, setImageUris] = useState([]);
    const [mainImage, setMainImage] = useState("");
    const [category, setCategory] = useState("");
    const [categories, setCategories] = useState([]);
    const [token, setToken] = useState("");
    const [error, setError] = useState("");
    const [countInStock, setCountInStock] = useState("");
    const [rating, setRating] = useState(0);
    const [isFeatured, setIsFeatured] = useState(false);
    const [richDescription, setRichDescription] = useState("");
    const [numReviews, setNumReviews] = useState(0);
    const [item, setItem] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigation = useNavigation();

    const normalizedName = String(name || "").trim();
    const normalizedBrand = String(brand || "").trim();
    const numericPrice = Number(price);
    const numericStock = Number(countInStock);
    const isFormValid =
        normalizedName.length >= 2
        && normalizedBrand.length >= 2
        && Number.isFinite(numericPrice)
        && numericPrice > 0
        && Number.isFinite(numericStock)
        && numericStock >= 0
        && String(description || "").trim().length >= 6
        && String(category || "").trim().length > 0;

    const normalizeUri = (uri) => String(uri || "").trim();

    const mergeUniqueImages = (list) => {
        const seen = new Set();
        const merged = [];
        (Array.isArray(list) ? list : []).forEach((uri) => {
            const clean = normalizeUri(uri);
            if (!clean || seen.has(clean)) return;
            seen.add(clean);
            merged.push(clean);
        });
        return merged.slice(0, MAX_PRODUCT_IMAGES);
    };

    useEffect(() => {
        if (props.route?.params?.item) {
            const i = props.route.params.item;
            setItem(i);
            setBrand(i.brand || "");
            setName(i.name || "");
            setPrice(String(i.price ?? ""));
            setDescription(i.description || "");
            const initialImages = mergeUniqueImages([...(Array.isArray(i.images) ? i.images : []), i.image]);
            setImageUris(initialImages);
            setMainImage(initialImages[0] || "");
            const catId = i.category?._id || i.category?.id || "";
            setCategory(catId);
            setPickerValue(catId);
            setCountInStock(String(i.countInStock ?? ""));
        } else {
            setItem(null);
            setImageUris([]);
            setMainImage("");
        }
        getJwtToken().then((res) => setToken(res || "")).catch(() => {});
        axios.get(`${baseURL}categories`).then((res) => setCategories(res.data)).catch(() => alert("Error loading categories"));
        if (Platform.OS !== "web") {
            ImagePicker.requestMediaLibraryPermissionsAsync().then(({ status }) => {
                if (status !== "granted") alert("Media library permission needed.");
            });
            ImagePicker.requestCameraPermissionsAsync().then(({ status }) => {
                if (status !== "granted") alert("Camera permission needed.");
            });
        }
        return () => setCategories([]);
    }, [props.route?.params]);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsMultipleSelection: true,
            selectionLimit: MAX_PRODUCT_IMAGES,
            quality: PICKER_IMAGE_QUALITY,
        });
        if (!result.canceled) {
            const picked = (result.assets || []).map((asset) => normalizeUri(asset?.uri)).filter(Boolean);
            const merged = mergeUniqueImages([...(imageUris || []), ...picked]);
            setImageUris(merged);
            setMainImage((prev) => prev || merged[0] || "");
        }
    };

    const takePhoto = async () => {
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: PICKER_IMAGE_QUALITY,
        });

        if (!result.canceled) {
            const uri = normalizeUri(result.assets?.[0]?.uri);
            if (!uri) return;
            const merged = mergeUniqueImages([uri, ...(imageUris || [])]);
            setImageUris(merged);
            setMainImage(uri);
        }
    };

    const removeImage = (uriToRemove) => {
        const updated = (imageUris || []).filter((uri) => uri !== uriToRemove);
        setImageUris(updated);
        if (mainImage === uriToRemove) {
            setMainImage(updated[0] || "");
        }
    };

    const addProduct = () => {
        if (isSubmitting) return;
        if (!isFormValid) {
            setError("Please complete all fields with valid values.");
            return;
        }
        setIsSubmitting(true);
        const formData = new FormData();
        formData.append("name", name);
        formData.append("brand", brand);
        formData.append("price", price);
        formData.append("description", description);
        formData.append("category", category);
        formData.append("countInStock", countInStock);
        formData.append("richDescription", richDescription);
        formData.append("rating", rating);
        formData.append("numReviews", numReviews);
        formData.append("isFeatured", isFeatured);

        const allImages = mergeUniqueImages([...(imageUris || [])]);
        const localImages = allImages.filter((uri) => uri.startsWith("file:"));
        const existingImages = allImages.filter((uri) => uri.startsWith("http://") || uri.startsWith("https://"));

        if (item) {
            formData.append("existingImages", JSON.stringify(existingImages));
        }

        localImages.forEach((uri, idx) => {
            const newImageUri = "file:///" + uri.split("file:/").join("");
            const imagePart = {
                uri: newImageUri,
                type: mime.getType(newImageUri) || "image/jpeg",
                name: newImageUri.split("/").pop() || `product-${Date.now()}-${idx}.jpg`,
            };
            formData.append("images", imagePart);
        });

        const config = {
            headers: {
                "Content-Type": "multipart/form-data",
                Authorization: "Bearer " + token,
            },
            timeout: 20000,
        };
        const productId = item?.id ?? item?._id;
        const thenNav = () => {
            Toast.show({ topOffset: 60, type: "success", text1: productId ? "Product updated" : "Product added" });
            setTimeout(() => navigation.navigate("Products"), 500);
        };
        const catchErr = (err) => {
            console.log('ProductForm error:', err?.response?.data || err?.message || err);
            const rawResponse = String(err?.response?.data || "");
            const isFileTooLarge = rawResponse.includes("File too large") || err?.response?.status === 413;
            const msg = isFileTooLarge
                ? "Image too large. Please retake/select a smaller image."
                : (err?.response?.data?.message || err?.message || "Something went wrong");
            Toast.show({ topOffset: 60, type: "error", text1: msg });
        };
        const request = productId
            ? axios.put(`${baseURL}products/${productId}`, formData, config)
            : axios.post(`${baseURL}products`, formData, config);

        request
            .then((res) => (res.status === 200 || res.status === 201) && thenNav())
            .catch(catchErr)
            .finally(() => setIsSubmitting(false));
    };

    return (
        <View style={styles.page}>
            <AppPageHeader title={item ? "Edit Product" : "Add Product"} />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.mediaCard}>
                    <View style={styles.imageContainer}>
                        <Image style={styles.image} source={{ uri: mainImage || FALLBACK_IMAGE }} />
                    </View>
                    <View style={styles.imageActionRow}>
                        <TouchableOpacity onPress={pickImage} style={styles.imageActionBtn}>
                            <Ionicons name="images-outline" size={16} color="#fff" />
                            <Text style={styles.imageActionText}>Gallery</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={takePhoto} style={styles.imageActionBtn}>
                            <Ionicons name="camera-outline" size={16} color="#fff" />
                            <Text style={styles.imageActionText}>Camera</Text>
                        </TouchableOpacity>
                    </View>
                    {(imageUris || []).length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
                            {imageUris.map((uri) => {
                                const isMain = uri === mainImage;
                                return (
                                    <View key={uri} style={styles.thumbWrap}>
                                        <TouchableOpacity onPress={() => setMainImage(uri)} activeOpacity={0.85}>
                                            <Image source={{ uri }} style={[styles.thumbImage, isMain && styles.thumbImageMain]} resizeMode="cover" />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.thumbRemoveBtn} onPress={() => removeImage(uri)}>
                                            <Ionicons name="close" size={13} color="#fff" />
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    ) : null}
                </View>

                <View style={styles.formCard}>
                    <View style={styles.label}><Text style={styles.labelText}>Brand</Text></View>
                    <Input placeholder="Enter brand" name="brand" id="brand" value={brand} onChangeText={setBrand} />

                    <View style={styles.label}><Text style={styles.labelText}>Product Name</Text></View>
                    <Input placeholder="Enter product name" name="name" id="name" value={name} onChangeText={setName} />

                    <View style={styles.rowWrap}>
                        <View style={styles.colHalf}>
                            <View style={styles.label}><Text style={styles.labelText}>Price</Text></View>
                            <Input placeholder="0.00" name="price" id="price" value={price} keyboardType="numeric" onChangeText={setPrice} />
                        </View>
                        <View style={styles.colHalf}>
                            <View style={styles.label}><Text style={styles.labelText}>Stock</Text></View>
                            <Input placeholder="0" name="stock" id="stock" value={countInStock} keyboardType="numeric" onChangeText={setCountInStock} />
                        </View>
                    </View>

                    <View style={styles.label}><Text style={styles.labelText}>Description</Text></View>
                    <Input placeholder="Enter product description" name="description" id="description" value={description} onChangeText={setDescription} />

                    <View style={styles.label}><Text style={styles.labelText}>Category</Text></View>
                    <View style={styles.pickerWrap}>
                        <Picker
                            selectedValue={pickerValue}
                            onValueChange={(e) => {
                                setPickerValue(e);
                                setCategory(e);
                            }}
                            style={styles.picker}
                            itemStyle={styles.pickerItem}
                            dropdownIconColor="#111"
                        >
                            <Picker.Item label="Select a category" value="" />
                            {categories.map((c) => (
                                <Picker.Item key={c.id || c._id} label={c.name} value={c.id || c._id} />
                            ))}
                        </Picker>
                    </View>

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <TouchableOpacity
                        style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                        onPress={addProduct}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.submitBtnText}>{item ? "Save Product" : "Create Product"}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    content: {
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 22,
    },
    mediaCard: {
        backgroundColor: "#fff",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#e5e5e5",
        paddingVertical: 14,
        paddingHorizontal: 12,
        marginBottom: 12,
        alignItems: "center",
    },
    imageContainer: {
        width: 156,
        height: 156,
        borderWidth: 2,
        justifyContent: "center",
        borderRadius: 12,
        borderColor: "#d8d8d8",
        overflow: "hidden",
        backgroundColor: "#eee",
    },
    image: {
        width: "100%",
        height: "100%",
    },
    imageActionRow: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 12,
        gap: 12,
    },
    imageActionBtn: {
        backgroundColor: "#111",
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    imageActionText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 12,
    },
    thumbRow: {
        marginTop: 10,
        paddingHorizontal: 2,
        paddingBottom: 2,
    },
    thumbWrap: {
        marginRight: 8,
        position: "relative",
    },
    thumbImage: {
        width: 56,
        height: 56,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#ccc",
        backgroundColor: "#f1f1f1",
    },
    thumbImageMain: {
        borderColor: "#111",
        borderWidth: 2,
    },
    thumbRemoveBtn: {
        position: "absolute",
        top: -5,
        right: -5,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: "#111",
        alignItems: "center",
        justifyContent: "center",
    },
    formCard: {
        backgroundColor: "#fff",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#e5e5e5",
        padding: 12,
    },
    label: {
        marginTop: 10,
        marginBottom: 4,
    },
    labelText: {
        color: "#2f2f2f",
        fontWeight: "700",
        fontSize: 12,
    },
    rowWrap: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    colHalf: {
        width: "49%",
    },
    pickerWrap: {
        borderWidth: 1,
        borderColor: "#d8d8d8",
        borderRadius: 10,
        backgroundColor: "#fff",
    },
    picker: {
        color: "#111",
        height: 54,
    },
    pickerItem: {
        color: "#111",
    },
    errorText: {
        marginTop: 10,
        color: "#b02323",
        fontSize: 12,
        fontWeight: "600",
    },
    submitBtn: {
        marginTop: 14,
        height: 46,
        borderRadius: 10,
        backgroundColor: "#111",
        alignItems: "center",
        justifyContent: "center",
    },
    submitBtnDisabled: {
        opacity: 0.55,
    },
    submitBtnText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "700",
    },
});

export default ProductForm;
