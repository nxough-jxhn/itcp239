import React, { useEffect, useMemo, useState } from "react";
import {
    View,
    StyleSheet,
    ScrollView,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { StackActions, useNavigation } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import baseURL from "../../assets/common/baseurl";
import Toast from "react-native-toast-message";
import { clearCart } from "../../Redux/Actions/cartActions";
import { getJwtToken } from "../../assets/common/authToken";

const Confirm = ({ route }) => {
    const order = route?.params?.order;
    const paymentMethod = route?.params?.paymentMethod || "Cash on Delivery";
    const paymentCard = route?.params?.paymentCard || "";
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const cartItems = useSelector((state) => state.cartItems || []);

    const [voucherModalVisible, setVoucherModalVisible] = useState(false);
    const [loadingVouchers, setLoadingVouchers] = useState(false);
    const [placingOrder, setPlacingOrder] = useState(false);
    const [successVisible, setSuccessVisible] = useState(false);
    const [activeVouchers, setActiveVouchers] = useState([]);
    const [voucherPreviewsByCode, setVoucherPreviewsByCode] = useState({});
    const [selectedVoucherCode, setSelectedVoucherCode] = useState("");
    const [selectedVoucherPreview, setSelectedVoucherPreview] = useState(null);
    const [createdOrderId, setCreatedOrderId] = useState("");
    const [redirectSeconds, setRedirectSeconds] = useState(5);

    const findNavigatorWithRoute = (routeName) => {
        let current = navigation;
        while (current) {
            const routeNames = current.getState?.()?.routeNames || [];
            if (routeNames.includes(routeName)) {
                return current;
            }
            current = current.getParent?.();
        }
        return null;
    };

    const findCartStackNavigator = () => {
        let current = navigation;
        while (current) {
            const routeNames = current.getState?.()?.routeNames || [];
            if (routeNames.includes("Cart") && routeNames.includes("Checkout")) {
                return current;
            }
            current = current.getParent?.();
        }
        return null;
    };

    const goToOrderDetails = () => {
        if (!createdOrderId) {
            continueHome();
            return;
        }

        const userTab = findNavigatorWithRoute("User");
        if (userTab) {
            userTab.navigate("User", {
                screen: "Order Details",
                params: { orderId: createdOrderId },
            });
        } else {
            navigation.navigate("User", {
                screen: "Order Details",
                params: { orderId: createdOrderId },
            });
        }

        setSuccessVisible(false);
    };

    const getItemFinalUnitPrice = (item) => {
        const discounted = Number(item?.discountedPrice);
        if (Number.isFinite(discounted) && discounted > 0) return discounted;
        return Number(item?.price || 0);
    };

    const getItemOriginalUnitPrice = (item) => Number(item?.price || 0);

    const itemCount = useMemo(
        () => (order?.orderItems || []).reduce((sum, item) => sum + Math.max(1, Number(item?.quantity || 1)), 0),
        [order]
    );

    const originalSubtotal = useMemo(
        () => (order?.orderItems || []).reduce(
            (sum, item) => sum + getItemOriginalUnitPrice(item) * Number(item?.quantity || 1),
            0
        ),
        [order]
    );

    const cartTotalAfterPromo = useMemo(
        () => (order?.orderItems || []).reduce(
            (sum, item) => sum + getItemFinalUnitPrice(item) * Number(item?.quantity || 1),
            0
        ),
        [order]
    );

    const promoDiscount = Math.max(0, originalSubtotal - cartTotalAfterPromo);
    const voucherDiscount = Number(selectedVoucherPreview?.voucherDiscount || 0);
    const shippingFee = 0;
    const finalTotal = Math.max(0, Number(cartTotalAfterPromo || 0) - voucherDiscount + shippingFee);

    const loadVoucherPreviews = async () => {
        if (!order?.orderItems?.length) {
            setActiveVouchers([]);
            setVoucherPreviewsByCode({});
            return;
        }

        try {
            setLoadingVouchers(true);
            const jwt = await getJwtToken();
            const config = { headers: { Authorization: `Bearer ${jwt}` } };

            const vouchersResponse = await axios.get(`${baseURL}promos/active-vouchers`, config);
            const vouchers = Array.isArray(vouchersResponse?.data) ? vouchersResponse.data : [];
            setActiveVouchers(vouchers);

            const previewPairs = await Promise.all(
                vouchers.map(async (voucher) => {
                    const code = String(voucher?.code || "").trim().toUpperCase();
                    if (!code) return ["", null];

                    try {
                        const previewResponse = await axios.post(
                            `${baseURL}promos/validate-voucher`,
                            { code, orderItems: order?.orderItems || [] },
                            config
                        );
                        return [code, previewResponse?.data || null];
                    } catch (error) {
                        return [
                            code,
                            {
                                valid: false,
                                message: error?.response?.data?.message || "Not eligible for this cart",
                                voucherDiscount: 0,
                            },
                        ];
                    }
                })
            );

            const previewMap = {};
            previewPairs.forEach(([code, preview]) => {
                if (code) previewMap[code] = preview;
            });
            setVoucherPreviewsByCode(previewMap);
        } catch (_error) {
            Toast.show({
                topOffset: 60,
                type: "error",
                text1: "Unable to load vouchers",
                text2: "Please try again in a few seconds",
            });
        } finally {
            setLoadingVouchers(false);
        }
    };

    useEffect(() => {
        if (voucherModalVisible) {
            loadVoucherPreviews();
        }
    }, [voucherModalVisible]);

    useEffect(() => {
        if (!successVisible) return;
        const timer = setTimeout(() => {
            setRedirectSeconds((prev) => Math.max(0, prev - 1));
        }, 1000);

        return () => clearTimeout(timer);
    }, [successVisible, redirectSeconds]);

    useEffect(() => {
        if (!successVisible) return;
        if (redirectSeconds > 0) return;
        goToOrderDetails();
    }, [successVisible, redirectSeconds, createdOrderId]);

    const selectVoucher = (code) => {
        const normalizedCode = String(code || "").trim().toUpperCase();
        const preview = voucherPreviewsByCode[normalizedCode] || null;

        if (!preview?.valid) {
            Toast.show({
                topOffset: 60,
                type: "error",
                text1: preview?.message || "Voucher is not valid for this order",
            });
            return;
        }

        setSelectedVoucherCode(normalizedCode);
        setSelectedVoucherPreview(preview);
        setVoucherModalVisible(false);
    };

    const removeVoucher = () => {
        setSelectedVoucherCode("");
        setSelectedVoucherPreview(null);
    };

    const placeOrder = async () => {
        if (placingOrder) return;

        try {
            setPlacingOrder(true);
            const jwt = await getJwtToken();
            const config = { headers: { Authorization: `Bearer ${jwt}` } };
            const payload = {
                ...order,
                ...(selectedVoucherPreview?.valid && selectedVoucherCode
                    ? { voucherCode: selectedVoucherCode }
                    : {}),
            };

            const response = await axios.post(`${baseURL}orders`, payload, config);
            const newOrderId = String(response?.data?.id || response?.data?._id || "");

            dispatch(clearCart());
            setCreatedOrderId(newOrderId);
            setRedirectSeconds(5);
            setSuccessVisible(true);
        } catch (error) {
            Toast.show({
                topOffset: 60,
                type: "error",
                text1: error?.response?.data?.message || "Something went wrong",
                text2: "Please try again",
            });
        } finally {
            setPlacingOrder(false);
        }
    };

    const continueHome = () => {
        setSuccessVisible(false);
        const cartStackNav = findCartStackNavigator();
        const homeNav = findNavigatorWithRoute("Home");
        const cartTabNav = findNavigatorWithRoute("Cart Screen");

        if (cartStackNav?.dispatch) {
            cartStackNav.dispatch(StackActions.popToTop());
        }

        if (homeNav?.navigate) {
            homeNav.navigate("Home");
            return;
        }

        if (cartTabNav?.navigate) {
            cartTabNav.navigate("Cart Screen", { screen: "Cart" });
            return;
        }

        navigation.navigate("Cart Screen", { screen: "Cart" });
    };

    if (!order) {
        return (
            <View style={styles.containerCenter}>
                <Text>No order data.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Address Details</Text>
                        <Text style={styles.changeText}>Change</Text>
                    </View>
                    <Text style={styles.addressText}>
                        {order.shippingAddress1}{order.shippingAddress2 ? `, ${order.shippingAddress2}` : ""}
                    </Text>
                    <Text style={styles.addressText}>{order.city}, {order.country}</Text>
                    <Text style={styles.addressSub}>+{order.phone}</Text>
                </View>

                <View style={styles.sectionBlock}>
                    <Text style={styles.blockTitle}>Payment Method</Text>
                    <View style={styles.methodRow}>
                        <View style={styles.methodLeft}>
                            <Ionicons name="checkmark-circle" size={18} color="#fff" />
                            <Text style={styles.methodRowText}>{paymentMethod}{paymentCard ? ` (${paymentCard})` : ""}</Text>
                        </View>
                        <Ionicons name="card-outline" size={18} color="#fff" />
                    </View>
                </View>

                <View style={styles.sectionBlock}>
                    <Text style={styles.blockTitle}>Add Voucher or Coupon</Text>
                    <View style={styles.voucherRow}>
                        <View style={styles.voucherLeft}>
                            <Ionicons name="ticket-outline" size={17} color="#9b9b9b" />
                            <Text style={styles.voucherRowText}>
                                {selectedVoucherCode ? selectedVoucherCode : "Choose your coupon"}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => setVoucherModalVisible(true)}>
                            <Text style={styles.applyText}>{selectedVoucherCode ? "Change" : "Apply"}</Text>
                        </TouchableOpacity>
                    </View>
                    {selectedVoucherCode ? (
                        <TouchableOpacity onPress={removeVoucher} style={styles.removeVoucherBtn}>
                            <Text style={styles.removeVoucherText}>Remove voucher</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>

                <View style={styles.summaryHeaderRow}>
                    <Text style={styles.blockTitle}>Order Summary</Text>
                    <Text style={styles.summaryItemCount}>({itemCount} Item{itemCount === 1 ? "" : "s"})</Text>
                </View>

                <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Subtotal (Original)</Text>
                        <Text style={styles.summaryValue}>${originalSubtotal.toFixed(2)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Promo Discount</Text>
                        <Text style={styles.discountValue}>- ${promoDiscount.toFixed(2)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Voucher</Text>
                        <Text style={styles.discountValue}>- ${voucherDiscount.toFixed(2)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Shipping Fee</Text>
                        <Text style={styles.summaryValue}>${shippingFee.toFixed(2)}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryRow}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>${finalTotal.toFixed(2)}</Text>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.placeOrderBtn} onPress={placeOrder} disabled={placingOrder}>
                    {placingOrder ? <ActivityIndicator color="#fff" /> : <Text style={styles.placeOrderText}>Place Order</Text>}
                </TouchableOpacity>
            </View>

            <Modal
                visible={voucherModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setVoucherModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Active Vouchers</Text>
                            <TouchableOpacity onPress={() => setVoucherModalVisible(false)}>
                                <Text style={styles.modalClose}>Close</Text>
                            </TouchableOpacity>
                        </View>

                        {loadingVouchers ? (
                            <View style={styles.modalLoadingWrap}>
                                <ActivityIndicator size="small" color="#111" />
                                <Text style={styles.modalLoadingText}>Loading voucher previews...</Text>
                            </View>
                        ) : (
                            <ScrollView contentContainerStyle={styles.voucherListContent}>
                                {activeVouchers.length === 0 ? (
                                    <Text style={styles.emptyVoucherText}>No active vouchers available right now.</Text>
                                ) : (
                                    activeVouchers.map((voucher) => {
                                        const code = String(voucher?.code || "").trim().toUpperCase();
                                        const preview = voucherPreviewsByCode[code];
                                        const previewDiscount = Number(preview?.voucherDiscount || 0);
                                        const previewTotal = Math.max(0, Number(cartTotalAfterPromo || 0) - previewDiscount + shippingFee);
                                        const isSelectable = !!preview?.valid;

                                        return (
                                            <View key={voucher._id || code} style={styles.voucherCard}>
                                                <Text style={styles.voucherCode}>{code}</Text>
                                                <Text style={styles.voucherName}>{voucher?.name || "Voucher"}</Text>
                                                <Text style={styles.voucherDesc}>{voucher?.description || "No description"}</Text>
                                                {preview ? (
                                                    preview.valid ? (
                                                        <View style={styles.previewBox}>
                                                            <Text style={styles.previewText}>You save ${previewDiscount.toFixed(2)}</Text>
                                                            <Text style={styles.previewText}>Final total ${previewTotal.toFixed(2)}</Text>
                                                        </View>
                                                    ) : (
                                                        <Text style={styles.previewInvalid}>{preview.message || "Not eligible"}</Text>
                                                    )
                                                ) : (
                                                    <Text style={styles.previewPending}>Checking voucher eligibility...</Text>
                                                )}

                                                <TouchableOpacity
                                                    style={[styles.selectBtn, !isSelectable && styles.selectBtnDisabled]}
                                                    disabled={!isSelectable}
                                                    onPress={() => selectVoucher(code)}
                                                >
                                                    <Text style={styles.selectBtnText}>Use this voucher</Text>
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })
                                )}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            <Modal visible={successVisible} transparent animationType="fade" onRequestClose={continueHome}>
                <View style={styles.successBackdrop}>
                    <View style={styles.successCard}>
                        <View style={styles.successIconWrap}>
                            <Ionicons name="checkmark-circle" size={42} color="#111" />
                        </View>
                        <Text style={styles.successTitle}>Order Successful!</Text>
                        <Text style={styles.successSub}>You have successfully made order</Text>
                        <Text style={styles.redirectText}>Redirecting to order details in {redirectSeconds}s...</Text>
                        <TouchableOpacity style={styles.successBtn} onPress={continueHome}>
                            <Text style={styles.successBtnText}>Go to Home</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    containerCenter: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f5f5f5",
    },
    content: {
        paddingHorizontal: 14,
        paddingTop: 8,
        paddingBottom: 120,
    },
    sectionCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: "#ececec",
    },
    sectionHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    sectionTitle: {
        color: "#333",
        fontSize: 17,
        fontWeight: "700",
    },
    changeText: {
        color: "#555",
        fontWeight: "700",
    },
    addressText: {
        color: "#2b2b2b",
        fontWeight: "600",
    },
    addressSub: {
        marginTop: 3,
        color: "#666",
    },
    sectionBlock: {
        marginTop: 16,
    },
    blockTitle: {
        color: "#424242",
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 8,
    },
    methodRow: {
        backgroundColor: "#0d0d0d",
        borderRadius: 12,
        minHeight: 50,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    methodLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        marginRight: 8,
    },
    methodRowText: {
        marginLeft: 8,
        color: "#fff",
        fontWeight: "700",
    },
    voucherRow: {
        backgroundColor: "#0d0d0d",
        borderRadius: 12,
        minHeight: 50,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    voucherLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        marginRight: 8,
    },
    voucherRowText: {
        marginLeft: 8,
        color: "#fff",
        fontWeight: "600",
    },
    applyText: {
        color: "#fff",
        fontWeight: "800",
    },
    removeVoucherBtn: {
        marginTop: 6,
        alignSelf: "flex-end",
    },
    removeVoucherText: {
        color: "#b51e1e",
        fontWeight: "700",
    },
    summaryHeaderRow: {
        marginTop: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    summaryItemCount: {
        color: "#979797",
        fontSize: 13,
        fontWeight: "600",
    },
    summaryCard: {
        marginTop: 8,
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: "#ececec",
    },
    summaryRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    summaryLabel: {
        color: "#666",
        fontWeight: "600",
    },
    summaryValue: {
        color: "#2f2f2f",
        fontWeight: "700",
    },
    discountValue: {
        color: "#1e7a35",
        fontWeight: "800",
    },
    summaryDivider: {
        borderBottomWidth: 1,
        borderBottomColor: "#ececec",
        marginVertical: 4,
    },
    totalLabel: {
        color: "#111",
        fontSize: 17,
        fontWeight: "800",
    },
    totalValue: {
        color: "#111",
        fontSize: 21,
        fontWeight: "800",
    },
    footer: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        borderTopWidth: 1,
        borderTopColor: "#ececec",
        backgroundColor: "#fff",
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    placeOrderBtn: {
        height: 50,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0d0d0d",
    },
    placeOrderText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "800",
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.35)",
        justifyContent: "flex-end",
    },
    modalSheet: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        maxHeight: "78%",
        paddingBottom: 12,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#efefef",
    },
    modalTitle: {
        fontWeight: "800",
        fontSize: 16,
        color: "#111",
    },
    modalClose: {
        color: "#555",
        fontWeight: "700",
    },
    modalLoadingWrap: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 30,
    },
    modalLoadingText: {
        marginTop: 8,
        color: "#666",
    },
    voucherListContent: {
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 8,
    },
    emptyVoucherText: {
        color: "#666",
        textAlign: "center",
        marginTop: 10,
    },
    voucherCard: {
        borderWidth: 1,
        borderColor: "#ececec",
        borderRadius: 12,
        padding: 10,
        marginBottom: 10,
        backgroundColor: "#fafafa",
    },
    voucherCode: {
        color: "#0f0f0f",
        fontWeight: "800",
        letterSpacing: 0.6,
    },
    voucherName: {
        marginTop: 2,
        color: "#111",
        fontWeight: "700",
    },
    voucherDesc: {
        marginTop: 2,
        color: "#5f5f5f",
    },
    previewBox: {
        marginTop: 8,
        backgroundColor: "#f1f7f1",
        borderColor: "#d7ead7",
        borderWidth: 1,
        borderRadius: 8,
        padding: 8,
    },
    previewText: {
        color: "#235f23",
        fontWeight: "700",
    },
    previewInvalid: {
        marginTop: 8,
        color: "#9b1f1f",
        fontWeight: "700",
    },
    previewPending: {
        marginTop: 8,
        color: "#777",
    },
    selectBtn: {
        marginTop: 10,
        backgroundColor: "#111",
        borderRadius: 8,
        height: 38,
        alignItems: "center",
        justifyContent: "center",
    },
    selectBtnDisabled: {
        backgroundColor: "#b7b7b7",
    },
    selectBtnText: {
        color: "#fff",
        fontWeight: "700",
    },
    successBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 22,
    },
    successCard: {
        width: "100%",
        borderRadius: 22,
        backgroundColor: "#fff",
        paddingHorizontal: 18,
        paddingVertical: 18,
        alignItems: "center",
    },
    successIconWrap: {
        width: 84,
        height: 84,
        borderRadius: 42,
        backgroundColor: "#f0f0f0",
        alignItems: "center",
        justifyContent: "center",
    },
    successTitle: {
        marginTop: 12,
        color: "#111",
        fontWeight: "800",
        fontSize: 24,
    },
    successSub: {
        marginTop: 8,
        color: "#666",
        fontSize: 14,
        textAlign: "center",
    },
    redirectText: {
        marginTop: 8,
        color: "#6a6a6a",
        fontSize: 12,
        fontWeight: "600",
    },
    successBtn: {
        marginTop: 16,
        width: "100%",
        height: 50,
        borderRadius: 12,
        backgroundColor: "#0f0f0f",
        alignItems: "center",
        justifyContent: "center",
    },
    successBtnText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "800",
    },
});

export default Confirm;
