import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import {
    PRODUCTS_REQUEST,
    PRODUCTS_SUCCESS,
    PRODUCTS_FAIL,
    PRODUCT_DETAIL_REQUEST,
    PRODUCT_DETAIL_SUCCESS,
    PRODUCT_DETAIL_FAIL,
} from "../constants";

const REQUEST_TIMEOUT_MS = 20000;

export const fetchProducts = () => async (dispatch) => {
    try {
        dispatch({ type: PRODUCTS_REQUEST });
        const response = await axios.get(`${baseURL}products`, { timeout: REQUEST_TIMEOUT_MS });
        dispatch({ type: PRODUCTS_SUCCESS, payload: response.data || [] });
    } catch (error) {
        dispatch({ type: PRODUCTS_FAIL, payload: error?.message || "Failed to load products" });
    }
};

export const fetchProductById = (productId) => async (dispatch) => {
    try {
        dispatch({ type: PRODUCT_DETAIL_REQUEST, productId });
        const response = await axios.get(`${baseURL}products/${productId}`, { timeout: REQUEST_TIMEOUT_MS });
        dispatch({ type: PRODUCT_DETAIL_SUCCESS, payload: response.data || {}, productId });
    } catch (error) {
        dispatch({ type: PRODUCT_DETAIL_FAIL, payload: error?.message || "Failed to load product", productId });
    }
};
