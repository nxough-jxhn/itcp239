import {
    ADD_TO_CART,
    REMOVE_FROM_CART,
    CLEAR_CART,
    SET_CART_ITEMS,
} from '../constants';

const getItemId = (item) => String(item?.id || item?._id || item?.product || "").trim();

const getMaxStock = (item) => {
    const stock = Number(item?.countInStock);
    if (!Number.isFinite(stock)) return null;
    if (stock <= 0) return 0;
    return Math.floor(stock);
};

const clampQuantityToStock = (item, quantity) => {
    const minQty = Math.max(1, Number(quantity || 1));
    const maxStock = getMaxStock(item);
    if (maxStock === 0) return 0;
    if (maxStock === null) return minQty;
    return Math.min(minQty, maxStock);
};

const normalizeItems = (items = []) => {
    const map = new Map();

    (Array.isArray(items) ? items : []).forEach((raw) => {
        const id = getItemId(raw);
        if (!id) return;

        const quantity = clampQuantityToStock(raw, raw?.quantity || 1);
        if (quantity <= 0) return;
        if (!map.has(id)) {
            map.set(id, { ...raw, quantity, id });
            return;
        }

        const existing = map.get(id);
        const mergedQuantity = Number(existing.quantity || 1) + quantity;
        map.set(id, {
            ...existing,
            quantity: clampQuantityToStock(existing, mergedQuantity),
        });
    });

    return [...map.values()];
};

const cartItems = (state = [], action) => {
    switch (action.type) {
        case ADD_TO_CART: {
            const next = [...state, action.payload];
            return normalizeItems(next);
        }
        case REMOVE_FROM_CART: {
            const payloadId = getItemId(action.payload);
            if (payloadId) {
                return state.filter((cartItem) => getItemId(cartItem) !== payloadId);
            }
            return state.filter((cartItem) => cartItem !== action.payload);
        }
        case CLEAR_CART:
            return [];
        case SET_CART_ITEMS:
            return normalizeItems(action.payload);
        default:
            return state;
    }
};

export default cartItems;
