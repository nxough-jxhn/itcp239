import {
    PRODUCTS_REQUEST,
    PRODUCTS_SUCCESS,
    PRODUCTS_FAIL,
    PRODUCT_DETAIL_REQUEST,
    PRODUCT_DETAIL_SUCCESS,
    PRODUCT_DETAIL_FAIL,
} from "../constants";

const initialState = {
    list: [],
    detailsById: {},
    loadingList: false,
    loadingDetails: false,
    error: null,
};

const products = (state = initialState, action) => {
    switch (action.type) {
        case PRODUCTS_REQUEST:
            return { ...state, loadingList: true, error: null };
        case PRODUCTS_SUCCESS:
            return { ...state, loadingList: false, list: Array.isArray(action.payload) ? action.payload : [] };
        case PRODUCTS_FAIL:
            return { ...state, loadingList: false, list: [], error: action.payload || "Failed to load products" };

        case PRODUCT_DETAIL_REQUEST:
            return { ...state, loadingDetails: true, error: null };
        case PRODUCT_DETAIL_SUCCESS: {
            const product = action.payload || {};
            const id = product.id || product._id;
            if (!id) return { ...state, loadingDetails: false };
            return {
                ...state,
                loadingDetails: false,
                detailsById: {
                    ...state.detailsById,
                    [String(id)]: product,
                },
            };
        }
        case PRODUCT_DETAIL_FAIL:
            return { ...state, loadingDetails: false, error: action.payload || "Failed to load product" };

        default:
            return state;
    }
};

export default products;
