import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
} from "react-native";
import axios from "axios";
import Toast from "react-native-toast-message";
import baseURL from "../../assets/common/baseurl";
import { getJwtToken } from "../../assets/common/authToken";
import AppPageHeader from "../../Shared/AppPageHeader";

const TARGET_MODES = [
    { key: "products", label: "Specific Products" },
    { key: "categories", label: "By Category" },
    { key: "all", label: "All Products" },
];

const DURATION_PRESETS = [
    { key: "manual", label: "Manual Dates" },
    { key: "3d", label: "3 Days" },
    { key: "7d", label: "7 Days" },
    { key: "1m", label: "1 Month" },
];

const DISCOUNT_TYPES = [
    { key: "percent", label: "Percent (%)" },
    { key: "fixed", label: "Fixed Amount" },
];

const CAMPAIGN_TYPES = [
    { key: "promo", label: "Promo" },
    { key: "voucher", label: "Voucher" },
];

const USAGE_POLICIES = [
    { key: "none", label: "No usage limit" },
    { key: "one_time_total", label: "One use total" },
    { key: "global_limit", label: "Global usage limit" },
    { key: "per_user_limit", label: "Per-user usage limit" },
];

function sanitizeNumericInput(value) {
    return String(value || "").replace(/[^0-9.]/g, "");
}

function sanitizeCodeInput(value) {
    return String(value || "").toUpperCase().replace(/[^A-Z0-9_-]/g, "");
}

function formatDateInput(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function startToday() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
}

function nextDate(days = 1) {
    const d = startToday();
    d.setDate(d.getDate() + days);
    return formatDateInput(d);
}

const PromoBroadcast = () => {
    const [jwt, setJwt] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [promos, setPromos] = useState([]);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);

    const [editingId, setEditingId] = useState("");
    const [reactivatingId, setReactivatingId] = useState("");

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [campaignType, setCampaignType] = useState("promo");
    const [discountType, setDiscountType] = useState("percent");
    const [discountValue, setDiscountValue] = useState("");
    const [code, setCode] = useState("");
    const [usagePolicy, setUsagePolicy] = useState("none");
    const [globalLimit, setGlobalLimit] = useState("");
    const [perUserLimit, setPerUserLimit] = useState("");
    const [minOrderAmount, setMinOrderAmount] = useState("");
    const [maxDiscountAmount, setMaxDiscountAmount] = useState("");
    const [durationPreset, setDurationPreset] = useState("manual");
    const [startAt, setStartAt] = useState(formatDateInput(startToday()));
    const [endAt, setEndAt] = useState(nextDate(7));
    const [targetMode, setTargetMode] = useState("products");
    const [targetProductIds, setTargetProductIds] = useState([]);
    const [targetCategoryIds, setTargetCategoryIds] = useState([]);
    const [productSearch, setProductSearch] = useState("");
    const [categorySearch, setCategorySearch] = useState("");

    const [pendingPayload, setPendingPayload] = useState(null);
    const [conflictInfo, setConflictInfo] = useState(null);

    const isEditing = !!editingId;
    const isReactivating = !!reactivatingId;

    const activeCount = useMemo(
        () => promos.filter((promo) => promo.status === "active" || promo.status === "scheduled").length,
        [promos]
    );

    const filteredProducts = useMemo(() => {
        const term = String(productSearch || "").trim().toLowerCase();
        if (!term) return products;
        return products.filter((product) => String(product?.name || "").toLowerCase().includes(term));
    }, [products, productSearch]);

    const filteredCategories = useMemo(() => {
        const term = String(categorySearch || "").trim().toLowerCase();
        if (!term) return categories;
        return categories.filter((category) => String(category?.name || "").toLowerCase().includes(term));
    }, [categories, categorySearch]);

    const loadAll = useCallback(async () => {
        try {
            setLoading(true);
            const token = (await getJwtToken()) || "";
            setJwt(token);
            const headers = { Authorization: `Bearer ${token}` };

            const [promoRes, productRes, categoryRes] = await Promise.all([
                axios.get(`${baseURL}promos`, { headers }),
                axios.get(`${baseURL}products`),
                axios.get(`${baseURL}categories`),
            ]);

            setPromos(Array.isArray(promoRes?.data) ? promoRes.data : []);
            setProducts(Array.isArray(productRes?.data) ? productRes.data : []);
            setCategories(Array.isArray(categoryRes?.data) ? categoryRes.data : []);
        } catch (error) {
            const apiMessage = error?.response?.data?.message || "Failed to load promo management data";
            Toast.show({ topOffset: 60, type: "error", text1: apiMessage });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    const resetForm = () => {
        setEditingId("");
        setReactivatingId("");
        setName("");
        setDescription("");
        setCampaignType("promo");
        setDiscountType("percent");
        setDiscountValue("");
        setCode("");
        setUsagePolicy("none");
        setGlobalLimit("");
        setPerUserLimit("");
        setMinOrderAmount("");
        setMaxDiscountAmount("");
        setDurationPreset("manual");
        setStartAt(formatDateInput(startToday()));
        setEndAt(nextDate(7));
        setTargetMode("products");
        setTargetProductIds([]);
        setTargetCategoryIds([]);
        setProductSearch("");
        setCategorySearch("");
        setConflictInfo(null);
        setPendingPayload(null);
    };

    const toggleId = (collection, setCollection, value) => {
        setCollection((prev) => {
            if (prev.includes(value)) return prev.filter((id) => id !== value);
            return [...prev, value];
        });
    };

    const applyPromoToForm = (promo) => {
        setEditingId(promo.id || promo._id || "");
        setReactivatingId("");
        setName(String(promo.name || ""));
        setDescription(String(promo.description || ""));
        setCampaignType(String(promo.type || "promo"));
        setDiscountType(String(promo.discountType || "percent"));
        setDiscountValue(String(promo.discountValue ?? ""));
        setCode(String(promo.code || ""));
        setUsagePolicy(String(promo.usagePolicy || "none"));
        setGlobalLimit(promo.globalLimit === null || promo.globalLimit === undefined ? "" : String(promo.globalLimit));
        setPerUserLimit(promo.perUserLimit === null || promo.perUserLimit === undefined ? "" : String(promo.perUserLimit));
        setMinOrderAmount(promo.minOrderAmount === null || promo.minOrderAmount === undefined ? "" : String(promo.minOrderAmount));
        setMaxDiscountAmount(promo.maxDiscountAmount === null || promo.maxDiscountAmount === undefined ? "" : String(promo.maxDiscountAmount));
        setDurationPreset(String(promo.durationPreset || "manual"));
        setStartAt(formatDateInput(promo.startAt));
        setEndAt(formatDateInput(promo.endAt));
        setTargetMode(String(promo.targetMode || "products"));
        setTargetProductIds((promo.targetProductIds || []).map((item) => String(item)));
        setTargetCategoryIds((promo.targetCategoryIds || []).map((item) => String(item)));
        setConflictInfo(null);
        setPendingPayload(null);
    };

    const buildPayload = () => {
        const payload = {
            name: String(name || "").trim(),
            description: String(description || "").trim(),
            type: campaignType,
            discountType,
            discountValue: Number(discountValue),
            durationPreset,
            startAt,
            targetMode,
        };

        if (campaignType === "voucher") {
            payload.code = sanitizeCodeInput(code);
            payload.usagePolicy = usagePolicy;
            payload.globalLimit = usagePolicy === "global_limit" ? Number(globalLimit) : null;
            payload.perUserLimit = usagePolicy === "per_user_limit" ? Number(perUserLimit) : null;
            payload.minOrderAmount = minOrderAmount === "" ? 0 : Number(minOrderAmount);
            payload.maxDiscountAmount = maxDiscountAmount === "" ? null : Number(maxDiscountAmount);
        }

        if (durationPreset === "manual") {
            payload.endAt = endAt;
        }
        if (targetMode === "products") {
            payload.targetProductIds = targetProductIds;
        }
        if (targetMode === "categories") {
            payload.targetCategoryIds = targetCategoryIds;
        }

        return payload;
    };

    const validateForm = () => {
        if (isReactivating) {
            if (!startAt) return "Start date is required";
            if (durationPreset === "manual" && !endAt) return "End date is required";
            return "";
        }

        if (!String(name || "").trim()) return "Promo name is required";
        if (!String(description || "").trim()) return "Promo description is required";

        if (campaignType === "voucher") {
            if (!sanitizeCodeInput(code)) return "Voucher code is required";
            if (usagePolicy === "global_limit") {
                const gl = Number(globalLimit);
                if (!Number.isFinite(gl) || gl < 1) return "Global usage limit must be a number >= 1";
            }
            if (usagePolicy === "per_user_limit") {
                const pu = Number(perUserLimit);
                if (!Number.isFinite(pu) || pu < 1) return "Per-user usage limit must be a number >= 1";
            }

            if (String(minOrderAmount || "").trim() !== "") {
                const minAmount = Number(minOrderAmount);
                if (!Number.isFinite(minAmount) || minAmount < 0) return "Minimum order amount must be a number >= 0";
            }

            if (String(maxDiscountAmount || "").trim() !== "") {
                const maxAmount = Number(maxDiscountAmount);
                if (!Number.isFinite(maxAmount) || maxAmount < 0) return "Max discount amount must be a number >= 0";
            }
        }

        const value = Number(discountValue);
        if (!Number.isFinite(value) || value <= 0) return "Discount value must be greater than zero";
        if (discountType === "percent" && value > 100) return "Percent discount cannot exceed 100";
        if (!startAt) return "Start date is required";
        if (durationPreset === "manual" && !endAt) return "End date is required";
        if (targetMode === "products" && targetProductIds.length === 0) return "Select at least one product";
        if (targetMode === "categories" && targetCategoryIds.length === 0) return "Select at least one category";
        return "";
    };

    const submitWithStrategy = async (conflictStrategy = "none") => {
        const payload = isReactivating
            ? {
                startAt,
                durationPreset,
                ...(durationPreset === "manual" ? { endAt } : {}),
                conflictStrategy,
            }
            : {
                ...buildPayload(),
                conflictStrategy,
            };

        const headers = {
            Authorization: `Bearer ${jwt}`,
            "Content-Type": "application/json",
        };

        try {
            setSaving(true);
            setPendingPayload(payload);

            let response = null;
            if (isReactivating) {
                response = await axios.post(`${baseURL}promos/${reactivatingId}/reactivate`, payload, { headers });
            } else if (isEditing) {
                response = await axios.put(`${baseURL}promos/${editingId}`, payload, { headers });
            } else {
                response = await axios.post(`${baseURL}promos`, payload, { headers });
            }

            const sent = Number(response?.data?.sent || 0);
            Toast.show({
                topOffset: 60,
                type: "success",
                text1: isReactivating ? "Promo reactivated" : isEditing ? "Promo updated" : "Promo created",
                text2: isReactivating
                    ? `Users notified: ${sent}`
                    : (!isEditing ? `Users notified: ${sent}` : undefined),
            });
            resetForm();
            await loadAll();
        } catch (error) {
            const status = Number(error?.response?.status || 0);
            if (status === 409) {
                setConflictInfo(error?.response?.data || null);
                Toast.show({
                    topOffset: 60,
                    type: "info",
                    text1: "Promo conflicts detected",
                    text2: "Choose exclude or override to continue",
                });
            } else {
                const apiMessage = error?.response?.data?.message || "Failed to submit promo";
                Toast.show({ topOffset: 60, type: "error", text1: apiMessage });
            }
        } finally {
            setSaving(false);
        }
    };

    const submitPromo = async () => {
        const validation = validateForm();
        if (validation) {
            Toast.show({ topOffset: 60, type: "error", text1: validation });
            return;
        }

        await submitWithStrategy("none");
    };

    const retryConflict = async (strategy) => {
        if (!pendingPayload) return;
        await submitWithStrategy(strategy);
    };

    const notifyPromo = async (promoId) => {
        try {
            const headers = { Authorization: `Bearer ${jwt}` };
            const response = await axios.post(`${baseURL}promos/${promoId}/notify`, {}, { headers });
            const sent = Number(response?.data?.sent || 0);
            Toast.show({ topOffset: 60, type: "success", text1: "Promo notification sent", text2: `Users notified: ${sent}` });
            await loadAll();
        } catch (error) {
            const apiMessage = error?.response?.data?.message || "Failed to notify users";
            Toast.show({ topOffset: 60, type: "error", text1: apiMessage });
        }
    };

    const deactivatePromo = async (promoId) => {
        try {
            const headers = { Authorization: `Bearer ${jwt}` };
            await axios.post(`${baseURL}promos/${promoId}/deactivate`, {}, { headers });
            Toast.show({ topOffset: 60, type: "success", text1: "Promo deactivated" });
            await loadAll();
        } catch (error) {
            const apiMessage = error?.response?.data?.message || "Failed to deactivate promo";
            Toast.show({ topOffset: 60, type: "error", text1: apiMessage });
        }
    };

    const prepareReactivate = (promo) => {
        setReactivatingId(promo.id || promo._id || "");
        setEditingId("");
        setDurationPreset("manual");
        setStartAt(formatDateInput(startToday()));
        setEndAt(nextDate(7));
        setConflictInfo(null);
        setPendingPayload(null);
    };

    const statusColor = (status) => {
        if (status === "active") return "#111";
        if (status === "scheduled") return "#2f2f2f";
        if (status === "inactive") return "#7a7a7a";
        if (status === "expired") return "#5a5a5a";
        return "#666";
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#111" />
                <Text style={styles.loadingText}>Loading promo manager...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <AppPageHeader title="Promo Broadcast" />

            <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.heading}>Promo Management</Text>
            <Text style={styles.subheading}>
                Active/Scheduled campaigns: {activeCount} | Total campaigns: {promos.length}
            </Text>

            <View style={styles.panel}>
                <Text style={styles.panelTitle}>
                    {isReactivating ? "Reactivate Campaign" : isEditing ? "Edit Campaign" : "Create Campaign"}
                </Text>

                {!isReactivating ? (
                    <>
                        <Text style={styles.label}>Promo Name</Text>
                        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Summer Court Sale" />

                        <Text style={styles.label}>Campaign Type</Text>
                        <View style={styles.rowWrap}>
                            {CAMPAIGN_TYPES.map((item) => (
                                <TouchableOpacity
                                    key={item.key}
                                    style={[styles.choiceChip, campaignType === item.key && styles.choiceChipActive]}
                                    onPress={() => setCampaignType(item.key)}
                                >
                                    <Text style={[styles.choiceText, campaignType === item.key && styles.choiceTextActive]}>{item.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Up to 30% off selected badminton and tennis gear"
                            multiline
                            textAlignVertical="top"
                        />

                        <Text style={styles.label}>Discount Type</Text>
                        <View style={styles.rowWrap}>
                            {DISCOUNT_TYPES.map((item) => (
                                <TouchableOpacity
                                    key={item.key}
                                    style={[styles.choiceChip, discountType === item.key && styles.choiceChipActive]}
                                    onPress={() => setDiscountType(item.key)}
                                >
                                    <Text style={[styles.choiceText, discountType === item.key && styles.choiceTextActive]}>{item.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Discount Value</Text>
                        <TextInput
                            style={styles.input}
                            value={discountValue}
                            onChangeText={(value) => setDiscountValue(sanitizeNumericInput(value))}
                            keyboardType="numeric"
                            placeholder={discountType === "percent" ? "e.g. 20" : "e.g. 150"}
                        />

                        {campaignType === "voucher" ? (
                            <>
                                <Text style={styles.label}>Voucher Code</Text>
                                <TextInput
                                    style={styles.input}
                                    value={code}
                                    onChangeText={(value) => setCode(sanitizeCodeInput(value))}
                                    autoCapitalize="characters"
                                    placeholder="WELCOME10"
                                />

                                <Text style={styles.label}>Usage Policy</Text>
                                <View style={styles.rowWrap}>
                                    {USAGE_POLICIES.map((item) => (
                                        <TouchableOpacity
                                            key={item.key}
                                            style={[styles.choiceChip, usagePolicy === item.key && styles.choiceChipActive]}
                                            onPress={() => setUsagePolicy(item.key)}
                                        >
                                            <Text style={[styles.choiceText, usagePolicy === item.key && styles.choiceTextActive]}>{item.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {usagePolicy === "global_limit" ? (
                                    <>
                                        <Text style={styles.label}>Global Usage Limit</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={globalLimit}
                                            onChangeText={(value) => setGlobalLimit(sanitizeNumericInput(value))}
                                            keyboardType="numeric"
                                            placeholder="e.g. 100"
                                        />
                                    </>
                                ) : null}

                                {usagePolicy === "per_user_limit" ? (
                                    <>
                                        <Text style={styles.label}>Per-user Usage Limit</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={perUserLimit}
                                            onChangeText={(value) => setPerUserLimit(sanitizeNumericInput(value))}
                                            keyboardType="numeric"
                                            placeholder="e.g. 1"
                                        />
                                    </>
                                ) : null}

                                <Text style={styles.label}>Minimum Order Amount (Optional)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={minOrderAmount}
                                    onChangeText={(value) => setMinOrderAmount(sanitizeNumericInput(value))}
                                    keyboardType="numeric"
                                    placeholder="e.g. 500"
                                />

                                <Text style={styles.label}>Max Discount Amount (Optional)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={maxDiscountAmount}
                                    onChangeText={(value) => setMaxDiscountAmount(sanitizeNumericInput(value))}
                                    keyboardType="numeric"
                                    placeholder="e.g. 150"
                                />
                            </>
                        ) : null}

                        <Text style={styles.label}>Apply To</Text>
                        <View style={styles.rowWrap}>
                            {TARGET_MODES.map((item) => (
                                <TouchableOpacity
                                    key={item.key}
                                    style={[styles.choiceChip, targetMode === item.key && styles.choiceChipActive]}
                                    onPress={() => setTargetMode(item.key)}
                                >
                                    <Text style={[styles.choiceText, targetMode === item.key && styles.choiceTextActive]}>{item.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {targetMode === "products" ? (
                            <View style={styles.selectionBox}>
                                <Text style={styles.selectionTitle}>Select Products ({targetProductIds.length})</Text>
                                <TextInput
                                    style={styles.searchInput}
                                    value={productSearch}
                                    onChangeText={setProductSearch}
                                    placeholder="Search products"
                                    placeholderTextColor="#8a8a8a"
                                />
                                <ScrollView
                                    style={styles.selectionScroll}
                                    contentContainerStyle={styles.chipGrid}
                                    nestedScrollEnabled
                                    showsVerticalScrollIndicator
                                >
                                    {filteredProducts.map((product) => {
                                        const id = String(product.id || product._id);
                                        const selected = targetProductIds.includes(id);
                                        return (
                                            <TouchableOpacity
                                                key={id}
                                                style={[styles.smallChip, selected && styles.smallChipActive]}
                                                onPress={() => toggleId(targetProductIds, setTargetProductIds, id)}
                                            >
                                                <Text style={[styles.smallChipText, selected && styles.smallChipTextActive]}>
                                                    {product.name}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                    {filteredProducts.length === 0 ? (
                                        <Text style={styles.emptySelectionText}>No products match your search.</Text>
                                    ) : null}
                                </ScrollView>
                            </View>
                        ) : null}

                        {targetMode === "categories" ? (
                            <View style={styles.selectionBox}>
                                <Text style={styles.selectionTitle}>Select Categories ({targetCategoryIds.length})</Text>
                                <TextInput
                                    style={styles.searchInput}
                                    value={categorySearch}
                                    onChangeText={setCategorySearch}
                                    placeholder="Search categories"
                                    placeholderTextColor="#8a8a8a"
                                />
                                <ScrollView
                                    style={styles.selectionScroll}
                                    contentContainerStyle={styles.chipGrid}
                                    nestedScrollEnabled
                                    showsVerticalScrollIndicator
                                >
                                    {filteredCategories.map((category) => {
                                        const id = String(category.id || category._id);
                                        const selected = targetCategoryIds.includes(id);
                                        return (
                                            <TouchableOpacity
                                                key={id}
                                                style={[styles.smallChip, selected && styles.smallChipActive]}
                                                onPress={() => toggleId(targetCategoryIds, setTargetCategoryIds, id)}
                                            >
                                                <Text style={[styles.smallChipText, selected && styles.smallChipTextActive]}>
                                                    {category.name}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                    {filteredCategories.length === 0 ? (
                                        <Text style={styles.emptySelectionText}>No categories match your search.</Text>
                                    ) : null}
                                </ScrollView>
                            </View>
                        ) : null}
                    </>
                ) : null}

                <Text style={styles.label}>Duration</Text>
                <View style={styles.rowWrap}>
                    {DURATION_PRESETS.map((item) => (
                        <TouchableOpacity
                            key={item.key}
                            style={[styles.choiceChip, durationPreset === item.key && styles.choiceChipActive]}
                            onPress={() => setDurationPreset(item.key)}
                        >
                            <Text style={[styles.choiceText, durationPreset === item.key && styles.choiceTextActive]}>{item.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Start Date (YYYY-MM-DD)</Text>
                <TextInput style={styles.input} value={startAt} onChangeText={setStartAt} placeholder="2026-03-20" />

                {durationPreset === "manual" ? (
                    <>
                        <Text style={styles.label}>End Date (YYYY-MM-DD)</Text>
                        <TextInput style={styles.input} value={endAt} onChangeText={setEndAt} placeholder="2026-03-27" />
                    </>
                ) : null}

                {conflictInfo ? (
                    <View style={styles.conflictBox}>
                        <Text style={styles.conflictTitle}>Conflict Detected</Text>
                        <Text style={styles.conflictText}>{conflictInfo?.message || "Promo overlap found."}</Text>
                        <View style={styles.rowWrap}>
                            <TouchableOpacity style={styles.outlineButton} onPress={() => retryConflict("exclude_conflicts")}> 
                                <Text style={styles.outlineButtonText}>Exclude Conflicts</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.solidDangerButton} onPress={() => retryConflict("override_conflicts")}> 
                                <Text style={styles.solidDangerButtonText}>Override Existing</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : null}

                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.primaryButton, saving && styles.buttonDisabled]}
                        onPress={submitPromo}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.primaryButtonText}>
                                {isReactivating ? "Reactivate Promo" : isEditing ? "Save Changes" : "Create Promo"}
                            </Text>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.ghostButton} onPress={resetForm}>
                        <Text style={styles.ghostButtonText}>Reset</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.panel}>
                <Text style={styles.panelTitle}>All Campaigns</Text>
                {promos.length === 0 ? (
                    <Text style={styles.emptyText}>No campaigns yet.</Text>
                ) : (
                    promos.map((promo) => {
                        const promoId = promo.id || promo._id;
                        const canDeactivate = promo.status === "active" || promo.status === "scheduled";
                        const canReactivate = promo.status === "inactive" || promo.status === "expired";
                        const canNotify = promo.status !== "inactive" && promo.status !== "expired";
                        return (
                            <View key={promoId} style={styles.promoCard}>
                                <View style={styles.promoHeader}>
                                    <Text style={styles.promoName}>{promo.name}</Text>
                                    <View style={[styles.statusBadge, { backgroundColor: statusColor(promo.status) }]}>
                                        <Text style={styles.statusBadgeText}>{String(promo.status || "unknown").toUpperCase()}</Text>
                                    </View>
                                </View>
                                <Text style={styles.promoDesc}>{promo.description}</Text>
                                <Text style={styles.metaText}>
                                    {(promo.type || "promo").toUpperCase()} | {promo.discountType === "percent" ? `${promo.discountValue}% off` : `-${promo.discountValue} fixed`} | {promo.targetMode}
                                </Text>
                                {promo.type === "voucher" ? (
                                    <Text style={styles.metaText}>Code: {promo.code || "-"} | Usage: {promo.usagePolicy || "none"}</Text>
                                ) : null}
                                <Text style={styles.metaText}>Start: {formatDateInput(promo.startAt)} | End: {formatDateInput(promo.endAt)}</Text>

                                <View style={styles.rowWrap}>
                                    <TouchableOpacity style={styles.outlineButton} onPress={() => applyPromoToForm(promo)}>
                                        <Text style={styles.outlineButtonText}>Edit</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.outlineButton, !canNotify && styles.outlineButtonDisabled]}
                                        onPress={() => notifyPromo(promoId)}
                                        disabled={!canNotify}
                                    >
                                        <Text style={[styles.outlineButtonText, !canNotify && styles.outlineButtonTextDisabled]}>Notify Users</Text>
                                    </TouchableOpacity>
                                    {canDeactivate ? (
                                        <TouchableOpacity style={styles.solidDangerButton} onPress={() => deactivatePromo(promoId)}>
                                            <Text style={styles.solidDangerButtonText}>Deactivate</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                    {canReactivate ? (
                                        <TouchableOpacity style={styles.solidButton} onPress={() => prepareReactivate(promo)}>
                                            <Text style={styles.solidButtonText}>Reactivate</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                            </View>
                        );
                    })
                )}
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
    content: {
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 24,
    },
    loadingContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f5f5f5",
    },
    loadingText: {
        marginTop: 10,
        color: "#444",
    },
    heading: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111",
        marginBottom: 6,
    },
    subheading: {
        fontSize: 12,
        color: "#555",
        marginBottom: 16,
    },
    panel: {
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 12,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#e5e5e5",
    },
    panelTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1a1a1a",
        marginBottom: 10,
    },
    label: {
        fontSize: 12,
        fontWeight: "600",
        color: "#222",
        marginBottom: 6,
    },
    input: {
        backgroundColor: "#fafafa",
        borderWidth: 1,
        borderColor: "#d4d4d4",
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 9,
        marginBottom: 12,
        color: "#111",
        fontSize: 13,
    },
    textArea: {
        minHeight: 100,
    },
    rowWrap: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 10,
    },
    choiceChip: {
        borderWidth: 1,
        borderColor: "#d0d0d0",
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 10,
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: "#fff",
    },
    choiceChipActive: {
        backgroundColor: "#111",
        borderColor: "#111",
    },
    choiceText: {
        color: "#333",
        fontSize: 12,
        fontWeight: "600",
    },
    choiceTextActive: {
        color: "#fff",
    },
    selectionBox: {
        borderWidth: 1,
        borderColor: "#ececec",
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
        maxHeight: 170,
        overflow: "hidden",
    },
    selectionScroll: {
        maxHeight: 120,
    },
    chipGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        paddingRight: 4,
    },
    selectionTitle: {
        fontSize: 12,
        fontWeight: "700",
        color: "#555",
        marginBottom: 8,
        textTransform: "uppercase",
    },
    searchInput: {
        backgroundColor: "#fafafa",
        borderWidth: 1,
        borderColor: "#d9d9d9",
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        color: "#111",
        fontSize: 12,
        marginBottom: 8,
    },
    smallChip: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 14,
        paddingVertical: 5,
        paddingHorizontal: 10,
        marginRight: 6,
        marginBottom: 6,
        backgroundColor: "#fafafa",
    },
    smallChipActive: {
        backgroundColor: "#ededed",
        borderColor: "#111",
    },
    smallChipText: {
        fontSize: 11,
        color: "#333",
    },
    smallChipTextActive: {
        color: "#111",
        fontWeight: "700",
    },
    emptySelectionText: {
        color: "#777",
        fontSize: 12,
        paddingVertical: 6,
    },
    conflictBox: {
        backgroundColor: "#f3f3f3",
        borderColor: "#cfcfcf",
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
    },
    conflictTitle: {
        color: "#2a2a2a",
        fontWeight: "700",
        marginBottom: 4,
    },
    conflictText: {
        color: "#444",
        marginBottom: 10,
        fontSize: 12,
    },
    actionRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    primaryButton: {
        flex: 1,
        backgroundColor: "#111",
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    buttonDisabled: {
        opacity: 0.75,
    },
    primaryButtonText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 15,
    },
    ghostButton: {
        marginLeft: 10,
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    ghostButtonText: {
        color: "#444",
        fontWeight: "700",
    },
    promoCard: {
        borderWidth: 1,
        borderColor: "#ececec",
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
        backgroundColor: "#fff",
    },
    promoHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    promoName: {
        fontSize: 15,
        fontWeight: "700",
        color: "#111",
        flex: 1,
        paddingRight: 8,
    },
    promoDesc: {
        color: "#333",
        fontSize: 13,
        marginBottom: 6,
    },
    metaText: {
        color: "#666",
        fontSize: 12,
        marginBottom: 4,
    },
    statusBadge: {
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    statusBadgeText: {
        color: "#fff",
        fontSize: 10,
        fontWeight: "700",
        letterSpacing: 0.4,
    },
    outlineButton: {
        borderWidth: 1,
        borderColor: "#999",
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 10,
        marginRight: 8,
        marginBottom: 8,
    },
    outlineButtonText: {
        color: "#333",
        fontWeight: "700",
        fontSize: 12,
    },
    outlineButtonDisabled: {
        borderColor: "#d8d8d8",
        backgroundColor: "#f2f2f2",
    },
    outlineButtonTextDisabled: {
        color: "#9a9a9a",
    },
    solidButton: {
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 10,
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: "#111",
    },
    solidButtonText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 12,
    },
    solidDangerButton: {
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 10,
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: "#3a3a3a",
    },
    solidDangerButtonText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 12,
    },
    emptyText: {
        color: "#666",
        fontSize: 13,
    },
});

export default PromoBroadcast;
