import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import {
    REVIEWS_REQUEST,
    REVIEWS_SUCCESS,
    REVIEWS_FAIL,
} from "../constants";

const REQUEST_TIMEOUT_MS = 8000;

export const fetchReviewsByProduct = ({ productId, sort = "date_desc", rating = 0, withMedia = false }) => async (dispatch) => {
    if (!productId) return;

    try {
        dispatch({ type: REVIEWS_REQUEST, productId });
        const params = { sort, withMedia };
        if (Number(rating) > 0) params.rating = Number(rating);

        const response = await axios.get(`${baseURL}products/${productId}/reviews`, {
            params,
            timeout: REQUEST_TIMEOUT_MS,
        });
        dispatch({
            type: REVIEWS_SUCCESS,
            payload: Array.isArray(response.data) ? response.data : [],
            productId,
        });
    } catch (error) {
        dispatch({ type: REVIEWS_FAIL, payload: error?.message || "Failed to load reviews", productId });
    }
};
