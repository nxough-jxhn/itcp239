import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import { getJwtToken } from "../../assets/common/authToken";
import {
    WISHLIST_IDS_REQUEST,
    WISHLIST_IDS_SUCCESS,
    WISHLIST_IDS_FAIL,
    WISHLIST_ITEMS_REQUEST,
    WISHLIST_ITEMS_SUCCESS,
    WISHLIST_ITEMS_FAIL,
    WISHLIST_TOGGLE_SUCCESS,
} from "../constants";

const REQUEST_TIMEOUT_MS = 20000;

export const fetchWishlistIds = () => async (dispatch) => {
    try {
        dispatch({ type: WISHLIST_IDS_REQUEST });
        const jwt = await getJwtToken();
        if (!jwt) {
            dispatch({ type: WISHLIST_IDS_SUCCESS, payload: [] });
            return;
        }

        const response = await axios.get(`${baseURL}wishlist/ids`, {
            headers: { Authorization: `Bearer ${jwt}` },
            timeout: REQUEST_TIMEOUT_MS,
        });

        dispatch({ type: WISHLIST_IDS_SUCCESS, payload: response?.data?.ids || [] });
    } catch (error) {
        dispatch({ type: WISHLIST_IDS_FAIL, payload: error?.message || "Failed to load wishlist ids" });
    }
};

export const fetchWishlistItems = (includeRemoved = true) => async (dispatch) => {
    try {
        dispatch({ type: WISHLIST_ITEMS_REQUEST });
        const jwt = await getJwtToken();
        if (!jwt) {
            dispatch({ type: WISHLIST_ITEMS_SUCCESS, payload: [] });
            return;
        }

        const response = await axios.get(`${baseURL}wishlist`, {
            params: { includeRemoved: includeRemoved ? "true" : "false" },
            headers: { Authorization: `Bearer ${jwt}` },
            timeout: REQUEST_TIMEOUT_MS,
        });

        dispatch({ type: WISHLIST_ITEMS_SUCCESS, payload: response?.data || [] });
    } catch (error) {
        dispatch({ type: WISHLIST_ITEMS_FAIL, payload: error?.message || "Failed to load wishlist" });
    }
};

export const toggleWishlistProduct = (productId) => async (dispatch) => {
    const id = String(productId || "").trim();
    if (!id) return { ok: false, message: "Missing product id" };

    try {
        const jwt = await getJwtToken();
        if (!jwt) return { ok: false, authRequired: true, message: "Please login first" };

        const response = await axios.post(
            `${baseURL}wishlist/toggle/${id}`,
            {},
            {
                headers: { Authorization: `Bearer ${jwt}` },
                timeout: REQUEST_TIMEOUT_MS,
            }
        );

        const wishlisted = response?.data?.wishlisted === true;
        dispatch({ type: WISHLIST_TOGGLE_SUCCESS, productId: id, wishlisted });
        return { ok: true, wishlisted };
    } catch (error) {
        return {
            ok: false,
            authRequired: Number(error?.response?.status) === 401,
            message: error?.response?.data?.message || "Failed to update wishlist",
        };
    }
};
