import {
    WISHLIST_IDS_REQUEST,
    WISHLIST_IDS_SUCCESS,
    WISHLIST_IDS_FAIL,
    WISHLIST_ITEMS_REQUEST,
    WISHLIST_ITEMS_SUCCESS,
    WISHLIST_ITEMS_FAIL,
    WISHLIST_TOGGLE_SUCCESS,
} from "../constants";

const initialState = {
    ids: [],
    items: [],
    loadingIds: false,
    loadingItems: false,
    error: "",
};

const wishlist = (state = initialState, action) => {
    switch (action.type) {
        case WISHLIST_IDS_REQUEST:
            return { ...state, loadingIds: true, error: "" };
        case WISHLIST_IDS_SUCCESS:
            return { ...state, loadingIds: false, ids: Array.isArray(action.payload) ? action.payload : [] };
        case WISHLIST_IDS_FAIL:
            return { ...state, loadingIds: false, error: action.payload || "Failed to load wishlist ids" };

        case WISHLIST_ITEMS_REQUEST:
            return { ...state, loadingItems: true, error: "" };
        case WISHLIST_ITEMS_SUCCESS:
            return { ...state, loadingItems: false, items: Array.isArray(action.payload) ? action.payload : [] };
        case WISHLIST_ITEMS_FAIL:
            return { ...state, loadingItems: false, error: action.payload || "Failed to load wishlist" };

        case WISHLIST_TOGGLE_SUCCESS: {
            const productId = String(action.productId || "");
            if (!productId) return state;

            const currentSet = new Set((state.ids || []).map((id) => String(id)));
            if (action.wishlisted) {
                currentSet.add(productId);
            } else {
                currentSet.delete(productId);
            }

            return {
                ...state,
                ids: [...currentSet],
            };
        }

        default:
            return state;
    }
};

export default wishlist;
