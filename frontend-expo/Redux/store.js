/**
 * Redux store: holds cart state (cartItems). Screens use useSelector / useDispatch to add/remove items.
 */
import { legacy_createStore as createStore, combineReducers, applyMiddleware } from 'redux';
import { thunk } from 'redux-thunk';

import cartItems from './Reducers/cartItems';
import products from './Reducers/products';
import orders from './Reducers/orders';
import reviews from './Reducers/reviews';
import wishlist from './Reducers/wishlist';

const reducers = combineReducers({
    cartItems: cartItems,
    products: products,
    orders: orders,
    reviews: reviews,
    wishlist: wishlist,
});

const store = createStore(reducers, applyMiddleware(thunk));

export default store;
