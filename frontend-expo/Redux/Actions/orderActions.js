import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import { getJwtToken } from "../../assets/common/authToken";
import {
    ORDERS_REQUEST,
    ORDERS_SUCCESS,
    ORDERS_FAIL,
    CLEAR_ORDERS,
    ORDER_DETAIL_REQUEST,
    ORDER_DETAIL_SUCCESS,
    ORDER_DETAIL_FAIL,
} from "../constants";

const REQUEST_TIMEOUT_MS = 8000;

export const fetchOrders = () => async (dispatch) => {
    try {
        dispatch({ type: ORDERS_REQUEST });
        const token = (await getJwtToken()) || "";
        const response = await axios.get(`${baseURL}orders`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: REQUEST_TIMEOUT_MS,
        });
        dispatch({ type: ORDERS_SUCCESS, payload: response.data || [] });
    } catch (error) {
        dispatch({ type: ORDERS_FAIL, payload: error?.message || "Failed to load orders" });
    }
};

export const fetchOrderById = (orderId) => async (dispatch) => {
    try {
        dispatch({ type: ORDER_DETAIL_REQUEST, orderId });
        const token = (await getJwtToken()) || "";
        const response = await axios.get(`${baseURL}orders/${orderId}`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: REQUEST_TIMEOUT_MS,
        });
        dispatch({ type: ORDER_DETAIL_SUCCESS, payload: response.data || {}, orderId });
    } catch (error) {
        dispatch({ type: ORDER_DETAIL_FAIL, payload: error?.message || "Failed to load order detail", orderId });
    }
};

export const clearOrders = () => ({ type: CLEAR_ORDERS });
