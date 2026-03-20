# Project Analysis: E-Commerce Mobile App (ITCP239)

## Project Overview

This is an **e-commerce mobile app** built with:
- **Frontend**: React Native with Expo (SDK 54)
- **Backend**: Node.js/Express with MongoDB (Mongoose)
- **State Management**: Redux (cart) + Context API (auth)

---

## Current Implementation Status

### ✅ ALREADY IMPLEMENTED

| Feature | Status | Location |
|---------|--------|----------|
| **Product CRUD** | ✅ Complete | [`backend/routes/products.js`](backend/routes/products.js), [`frontend-expo/Screens/Admin/ProductForm.js`](frontend-expo/Screens/Admin/ProductForm.js) |
| **Category CRUD** | ✅ Complete | [`backend/routes/categories.js`](backend/routes/categories.js), [`frontend-expo/Screens/Admin/Categories.js`](frontend-expo/Screens/Admin/Categories.js) |
| **User Registration** | ✅ Complete | [`frontend-expo/Screens/User/Register.js`](frontend-expo/Screens/User/Register.js) - includes photo upload |
| **User Login** | ✅ Complete | [`frontend-expo/Screens/User/Login.js`](frontend-expo/Screens/User/Login.js) |
| **User Profile Update** | ✅ Complete | [`frontend-expo/Screens/User/UserProfile.js`](frontend-expo/Screens/User/UserProfile.js) |
| **Product Search** | ✅ Complete | [`frontend-expo/Screens/Product/ProductContainer.js`](frontend-expo/Screens/Product/ProductContainer.js) - text search |
| **Category Filter** | ✅ Complete | [`frontend-expo/Screens/Product/CategoryFilter.js`](frontend-expo/Screens/Product/CategoryFilter.js) |
| **Cart (Redux)** | ✅ Complete | [`frontend-expo/Redux/`](frontend-expo/Redux/) - uses Redux + AsyncStorage |
| **Checkout Flow** | ✅ Complete | [`frontend-expo/Screens/Checkout/`](frontend-expo/Screens/Checkout/) |
| **Order Creation** | ✅ Complete | [`backend/routes/orders.js`](backend/routes/orders.js) |
| **Order Status Update** | ✅ Complete | [`backend/routes/orders.js`](backend/routes/orders.js) |
| **Push Notifications** | ✅ Complete | [`backend/services/notifications.js`](backend/services/notifications.js), [`frontend-expo/App.js`](frontend-expo/App.js) |
| **Order Status Push Notification** | ✅ Complete | Implemented in [`backend/routes/orders.js:205-212`](backend/routes/orders.js:205) |
| **Drawer Navigation** | ✅ Complete | [`frontend-expo/Navigators/DrawerNavigator.js`](frontend-expo/Navigators/DrawerNavigator.js) |
| **JWT Auth** | ✅ Complete | [`backend/middleware/authJwt.js`](backend/middleware/authJwt.js), tokens stored in AsyncStorage |
| **Admin Dashboard** | ✅ Complete | [`frontend-expo/Screens/Admin/`](frontend-expo/Screens/Admin/) |
| **Stock Alerts** | ✅ Complete | [`backend/routes/stockAlerts.js`](backend/routes/stockAlerts.js), [`frontend-expo/Screens/Admin/StockAlerts.js`](frontend-expo/Screens/Admin/StockAlerts.js) |
| **Social Auth API (Google/Facebook)** | ⚠️ Partial | [`backend/routes/users.js`](backend/routes/users.js) - endpoints exist, needs correct env/config |

---

### ❌ NOT YET IMPLEMENTED

| Feature | Points | Status | Notes |
|---------|--------|--------|-------|
| **Google/Facebook Login** | 20pts | ⚠️ Partial | Frontend wired, backend endpoints exist, but not working (likely config) |
| **User Reviews/Ratings** | 20pts | ❌ Not implemented | Only admin can set rating manually |
| **SQLite Cart Storage** | 20pts | ❌ Not implemented | Currently using AsyncStorage + Redux |
| **Price Range Filter** | 15pts | ❌ Not implemented | Only category filter exists |
| **Search by Category + Price** | 15pts | ❌ Not implemented | Need combined filter |
| **Promo/Discount Notifications** | 10pts | ❌ Not implemented | No admin feature to send promos |
| **Notification Details View** | 5pts | ❌ Not implemented | Need notification detail screen |
| **Redux for Products/Orders** | 15pts | ⚠️ Partial | Only cart uses Redux |
| **Wishlist** | N/A | ❌ Not implemented | Listed in PAGES_NEEDED.md |

---

## Detailed Analysis

### 1. MP1: Product/Service CRUD (20 pts) ✅ COMPLETE
- Backend: [`products.js`](backend/routes/products.js) - Full CRUD with image upload
- Frontend: [`ProductForm.js`](frontend-expo/Screens/Admin/ProductForm.js) - Admin form
- Photo upload: Using multer on backend, expo-image-picker on frontend

### 2. MP2: User Functions (15-20 pts)
- **Registration**: ✅ Complete with photo upload/camera
- **Login**: ✅ Complete
- **Profile Update**: ✅ Complete with address map picker
- **Google/Facebook**: ⚠️ Partially implemented (frontend wired, backend endpoints exist; needs correct config). Facebook planned for removal.

### 3. MP3: Review Ratings (20 pts) ❌ NOT IMPLEMENTED
- Current state: Only `rating` and `numReviews` fields exist in Product model, but these are **manually set by admin**
- Need to create:
  - Review model
  - Review API routes
  - User review submission screen
  - Verify user purchased product before allowing review

### 4. MP4: SQLite Cart (12-20 pts) ❌ NOT IMPLEMENTED
- Current: Using Redux + AsyncStorage
- Required: SQLite (expo-sqlite)
- Need to migrate cart storage to SQLite

### 5. Term Test: Transaction (35 pts) ✅ MOSTLY COMPLETE
- ✅ Completed transaction (10pts)
- ✅ Update status (5pts)
- ✅ Push notification on status update (10pts)
- ⚠️ Click notification to view order details (10pts) - Need to handle notification tap navigation

### 6. Quiz 1: Search/Filters (15 pts)
- ✅ Search function
- ✅ Category filter
- ❌ Price range filter (10pts)
- ❌ Category + Price combined (15pts)

### 7. Quiz 2: Notifications (15 pts)
- ❌ Promo/discount push notifications (10pts)
- ❌ View notification details (5pts)

### 8. Quiz 3: Redux (15 pts) ⚠️ PARTIAL
- ✅ Cart uses Redux
- ❌ Products not in Redux
- ❌ Orders not in Redux
- ❌ Reviews not in Redux

### 9. Unit 1: UI with Drawer (20 pts) ✅ COMPLETE
- Drawer navigator implemented
- Multiple tabs: Home, Cart, Admin, User

### 10. Unit 2: Node Backend + JWT (20 pts) ✅ COMPLETE
- JWT tokens working
- Push token saved on user model
- Token stored in AsyncStorage on frontend

---

## Technology Stack

### Backend
```
- Express.js
- MongoDB + Mongoose
- JWT (jsonwebtoken)
- Firebase Admin (for FCM push)
- Multer (file uploads)
- bcryptjs (password hashing)
```

### Frontend
```
- React Native + Expo SDK 54
- Redux + Redux Thunk
- React Navigation (Drawer, Stack, Tabs)
- expo-notifications
- expo-image-picker
- expo-camera
- expo-location
- react-native-maps
- AsyncStorage
- axios
- react-native-paper (UI components)
```

---

## Recommended Implementation Plan

### Priority 1: High-Point Items
1. **SQLite Cart** (20pts) - Replace AsyncStorage with SQLite
2. **Review/Rating System** (20pts) - User reviews on products
3. **Redux for Products/Orders** (15pts) - Complete Redux implementation

### Priority 2: Search/Filter Enhancements
4. **Price Range Filter** (10pts)
5. **Category + Price Combined** (5pts more for full 15pts)

### Priority 3: Notifications
6. **Promo/Discount Notifications** (10pts)
7. **Notification Details View** (5pts)

### Priority 4: Social Auth (Bonus)
8. **Google Login only** (keep Google, remove Facebook)
9. **Validate social auth config** (GOOGLE_CLIENT_ID on backend, correct Expo client ID on frontend)

---

## Files Structure

```
backend/
├── config/          # Database and app config
├── middleware/      # JWT auth middleware
├── models/          # Mongoose schemas (User, Product, Order, Category)
├── routes/          # API endpoints
├── services/        # Notification service (FCM + Expo)
└── uploads/         # Product image storage

frontend-expo/
├── Context/         # Auth context
├── Navigators/     # Navigation (Drawer, Stack, Tabs)
├── Redux/          # Cart state management
├── Screens/        # All app screens
│   ├── Admin/      # Admin panels
│   ├── Cart/       # Shopping cart
│   ├── Checkout/   # Checkout flow
│   ├── Product/    # Product listing/search
│   └── User/       # User auth & profile
└── Shared/         # Reusable components
```
