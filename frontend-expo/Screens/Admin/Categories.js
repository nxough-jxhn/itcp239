import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    FlatList,
    TextInput,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    RefreshControl,
} from "react-native";
import baseURL from "../../assets/common/baseurl";
import axios from "axios";
import { getJwtToken } from "../../assets/common/authToken";
import AppPageHeader from "../../Shared/AppPageHeader";
import Toast from "react-native-toast-message";

const SAMPLE_NAMES = ["Electronics", "Sports", "Accessories", "Home"];
const MAX_NAME_LENGTH = 40;

const normalizeCategoryName = (value) => {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, MAX_NAME_LENGTH);
};

const Item = ({ item, onEdit, onDelete, isDeleting }) => {
    const id = item.id || item._id;
    return (
        <View style={styles.itemCard}>
            <View style={styles.itemInfoWrap}>
                <Text numberOfLines={1} style={styles.itemName}>{String(item.name || "Unnamed")}</Text>
                <Text style={styles.itemMeta}>ID: {String(id || "-").slice(-8).toUpperCase()}</Text>
            </View>

            <View style={styles.itemActions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(item)}>
                    <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.deleteBtn, isDeleting && styles.disabledBtn]}
                    onPress={() => onDelete(id)}
                    disabled={isDeleting}
                >
                    {isDeleting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.deleteBtnText}>Delete</Text>}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const Categories = () => {
    const [categories, setCategories] = useState([]);
    const [categoryName, setCategoryName] = useState("");
    const [token, setToken] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const normalizedName = useMemo(() => normalizeCategoryName(categoryName), [categoryName]);
    const duplicateExists = useMemo(() => {
        const lower = normalizedName.toLowerCase();
        if (!lower) return false;
        return categories.some((item) => {
            const sameId = String(item.id || item._id) === String(editingId || "");
            if (sameId) return false;
            return String(item.name || "").trim().toLowerCase() === lower;
        });
    }, [categories, normalizedName, editingId]);

    const validationMessage = useMemo(() => {
        if (!normalizedName) return "Name is required.";
        if (normalizedName.length < 2) return "Name must be at least 2 characters.";
        if (duplicateExists) return "Category name already exists.";
        return "";
    }, [normalizedName, duplicateExists]);

    const canSubmit = !isSubmitting && !validationMessage;

    const loadCategories = useCallback(async ({ showSpinner = false } = {}) => {
        if (showSpinner) setLoading(true);
        try {
            const res = await axios.get(`${baseURL}categories`);
            setCategories(Array.isArray(res.data) ? res.data : []);
        } catch (_error) {
            Toast.show({ topOffset: 60, type: "error", text1: "Error loading categories" });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        getJwtToken().then((res) => setToken(res || "")).catch(() => {});
        loadCategories({ showSpinner: true });
        return () => {
            setCategories([]);
            setToken("");
        };
    }, [loadCategories]);

    const resetEdit = () => {
        setEditingId(null);
        setCategoryName("");
    };

    const submitCategory = async () => {
        if (!canSubmit) {
            if (validationMessage) {
                Toast.show({ topOffset: 60, type: "error", text1: validationMessage });
            }
            return;
        }
        setIsSubmitting(true);
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const payload = { name: normalizedName };
        const request = editingId
            ? axios.put(`${baseURL}categories/${editingId}`, payload, config)
            : axios.post(`${baseURL}categories`, payload, config);

        try {
            const res = await request;
            if (editingId) {
                const updated = res.data;
                setCategories((prev) =>
                    prev.map((item) => ((item.id || item._id) === editingId ? updated : item))
                );
                Toast.show({ topOffset: 60, type: "success", text1: "Category updated" });
            } else {
                setCategories((prev) => [...prev, res.data]);
                Toast.show({ topOffset: 60, type: "success", text1: "Category created" });
            }
            resetEdit();
        } catch (_error) {
            Toast.show({ topOffset: 60, type: "error", text1: editingId ? "Error updating category" : "Error adding category" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const startEdit = (item) => {
        setEditingId(item.id || item._id);
        setCategoryName(item.name || "");
    };

    const deleteCategory = async (id) => {
        if (deletingId || !id) return;
        setDeletingId(id);
        const config = { headers: { Authorization: `Bearer ${token}` } };

        try {
            await axios.delete(`${baseURL}categories/${id}`, config);
            setCategories((prev) => prev.filter((item) => (item.id || item._id) !== id));
            if (editingId === id) resetEdit();
            Toast.show({ topOffset: 60, type: "success", text1: "Category deleted" });
        } catch (_error) {
            Toast.show({ topOffset: 60, type: "error", text1: "Error deleting category" });
        } finally {
            setDeletingId(null);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadCategories();
    };

    return (
        <View style={styles.container}>
            <AppPageHeader title="Categories" />

            <View style={styles.content}>
                <View style={styles.formCard}>
                    <Text style={styles.formTitle}>{editingId ? "Edit Category" : "Create Category"}</Text>
                    <Text style={styles.formHint}>Name:</Text>
                    <TextInput
                        value={categoryName}
                        style={[styles.input, validationMessage ? styles.inputError : null]}
                        onChangeText={setCategoryName}
                        placeholder="Enter name here"
                        placeholderTextColor="#9a9a9a"
                        maxLength={MAX_NAME_LENGTH}
                    />

                    <View style={styles.sampleRow}>
                        {SAMPLE_NAMES.map((sample) => (
                            <TouchableOpacity key={sample} style={styles.sampleChip} onPress={() => setCategoryName(sample)}>
                                <Text style={styles.sampleChipText}>{sample}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.formFooterRow}>
                        <Text style={[styles.validationText, !validationMessage && styles.validationTextOk]}>
                            {validationMessage || `Ready to ${editingId ? "update" : "create"}`}
                        </Text>
                        <Text style={styles.charCount}>{normalizedName.length}/{MAX_NAME_LENGTH}</Text>
                    </View>

                    <View style={styles.formActionsRow}>
                        <TouchableOpacity
                            style={[styles.primaryBtn, !canSubmit && styles.disabledBtn]}
                            onPress={submitCategory}
                            disabled={!canSubmit}
                        >
                            {isSubmitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryBtnText}>{editingId ? "Update" : "Create"}</Text>}
                        </TouchableOpacity>

                        {editingId ? (
                            <TouchableOpacity style={styles.secondaryBtn} onPress={resetEdit}>
                                <Text style={styles.secondaryBtnText}>Cancel</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>

                <Text style={styles.listTitle}>Category List</Text>

                {loading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator color="#111" size="small" />
                        <Text style={styles.loadingText}>Loading categories...</Text>
                    </View>
                ) : null}

                <FlatList
                    data={categories}
                    renderItem={({ item, index }) => (
                        <Item
                            item={item}
                            index={index}
                            onEdit={startEdit}
                            onDelete={deleteCategory}
                            isDeleting={deletingId === (item.id || item._id)}
                        />
                    )}
                    keyExtractor={(item) => String(item.id || item._id)}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={!loading ? <Text style={styles.emptyText}>No categories found.</Text> : null}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f4f4f4",
    },
    content: {
        flex: 1,
        paddingHorizontal: 12,
        paddingTop: 10,
    },
    formCard: {
        backgroundColor: "#fff",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#e5e5e5",
        padding: 12,
        marginBottom: 12,
    },
    formTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#111",
    },
    formHint: {
        marginTop: 10,
        marginBottom: 6,
        fontSize: 12,
        fontWeight: "600",
        color: "#2f2f2f",
    },
    input: {
        height: 40,
        borderColor: "#cfcfcf",
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 10,
        fontSize: 13,
        color: "#111",
    },
    inputError: {
        borderColor: "#b42c2c",
    },
    sampleRow: {
        marginTop: 10,
        flexDirection: "row",
        flexWrap: "wrap",
    },
    sampleChip: {
        backgroundColor: "#f0f0f0",
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 14,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginRight: 8,
        marginBottom: 8,
    },
    sampleChipText: {
        fontSize: 12,
        color: "#333",
        fontWeight: "600",
    },
    formFooterRow: {
        marginTop: 2,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    validationText: {
        color: "#b42c2c",
        fontSize: 12,
        fontWeight: "600",
    },
    validationTextOk: {
        color: "#2b2b2b",
    },
    charCount: {
        color: "#666",
        fontSize: 11,
    },
    formActionsRow: {
        marginTop: 10,
        flexDirection: "row",
        alignItems: "stretch",
    },
    primaryBtn: {
        minWidth: 108,
        height: 40,
        paddingHorizontal: 16,
        borderRadius: 10,
        backgroundColor: "#111",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 8,
    },
    primaryBtnText: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "700",
    },
    secondaryBtn: {
        minWidth: 92,
        height: 40,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#bbb",
        backgroundColor: "#f3f3f3",
        alignItems: "center",
        justifyContent: "center",
    },
    secondaryBtnText: {
        color: "#303030",
        fontSize: 13,
        fontWeight: "700",
    },
    disabledBtn: {
        opacity: 0.55,
    },
    listTitle: {
        marginBottom: 6,
        fontSize: 15,
        fontWeight: "700",
        color: "#111",
    },
    listContent: {
        paddingBottom: 14,
    },
    itemCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e4e4e4",
        paddingVertical: 10,
        paddingHorizontal: 10,
        marginBottom: 8,
        flexDirection: "row",
        alignItems: "center",
    },
    itemInfoWrap: {
        flex: 1,
        marginRight: 8,
    },
    itemName: {
        fontSize: 14,
        fontWeight: "700",
        color: "#1a1a1a",
    },
    itemMeta: {
        marginTop: 2,
        fontSize: 11,
        color: "#666",
    },
    itemActions: {
        flexDirection: "row",
        alignItems: "center",
        flexShrink: 0,
    },
    editBtn: {
        minWidth: 64,
        height: 34,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#bdbdbd",
        backgroundColor: "#f3f3f3",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 6,
    },
    editBtnText: {
        color: "#202020",
        fontSize: 12,
        fontWeight: "700",
    },
    deleteBtn: {
        minWidth: 72,
        height: 34,
        borderRadius: 8,
        backgroundColor: "#151515",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 10,
    },
    deleteBtnText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "700",
    },
    loadingWrap: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
    },
    loadingText: {
        marginLeft: 8,
        color: "#555",
        fontSize: 12,
    },
    emptyText: {
        paddingVertical: 18,
        textAlign: "center",
        color: "#666",
        fontSize: 13,
    },
});

export default Categories;
