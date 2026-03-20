# Detailed Folder Restructure Plan

## Overview

This plan reorganizes the `Screens/` folder to clearly separate:
- **Admin pages** (for store administrators)
- **Customer pages** (for regular shoppers)

---

## Current vs Proposed File Mapping

### Current Structure
```
Screens/
├── Admin/              # ← Admin pages
│   ├── Categories.js
│   ├── ListItem.js
│   ├── Orders.js
│   ├── ProductForm.js
│   ├── Products.js
│   └── StockAlerts.js
├── Cart/               # ← Customer
│   └── Cart.js
├── Checkout/           # ← Customer
│   ├── Checkout.js
│   ├── Confirm.js
│   └── Payment.js
├── Product/            # ← Customer
│   ├── CategoryFilter.js
│   ├── ProductCard.js
│   ├── ProductContainer.js
│   ├── ProductList.js
│   ├── SearchedProduct.js
│   └── SingleProduct.js
└── User/               # ← Customer
    ├── Login.js
    ├── MyOrders.js
    ├── NotificationCenter.js
    ├── Register.js
    └── UserProfile.js
```

### Proposed Structure
```
Screens/
├── Admin/                       # ← Admin-only (requires isAdmin: true)
│   ├── Categories.js           # Manage categories
│   ├── Orders.js               # View all orders
│   ├── ProductForm.js         # Add/Edit products
│   ├── Products.js            # Product list
│   └── StockAlerts.js         # Stock alerts
│
└── Customer/                    # ← Customer-only (any logged-in user)
    ├── Auth/
    │   ├── Login.js           # Login screen
    │   └── Register.js        # Registration screen
    ├── Cart/
    │   └── Cart.js            # Shopping cart
    ├── Checkout/
    │   ├── Checkout.js        # Shipping address
    │   ├── Confirm.js         # Order confirmation
    │   └── Payment.js         # Payment selection
    ├── Home/
    │   ├── CategoryFilter.js  # Category buttons
    │   ├── ProductCard.js     # Product card component
    │   ├── ProductContainer.js # Main product screen
    │   ├── ProductList.js    # Product list
    │   ├── SearchedProduct.js # Search results
    │   └── SingleProduct.js   # Product details
    ├── Orders/
    │   └── MyOrders.js        # Customer's orders
    └── Profile/
        ├── NotificationCenter.js # Notifications
        └── UserProfile.js      # User profile
```

---

## Files to Move (Summary)

| From | To |
|------|-----|
| `Screens/User/Login.js` | `Screens/Customer/Auth/Login.js` |
| `Screens/User/Register.js` | `Screens/Customer/Auth/Register.js` |
| `Screens/User/UserProfile.js` | `Screens/Customer/Profile/UserProfile.js` |
| `Screens/User/MyOrders.js` | `Screens/Customer/Orders/MyOrders.js` |
| `Screens/User/NotificationCenter.js` | `Screens/Customer/Profile/NotificationCenter.js` |
| `Screens/Cart/Cart.js` | `Screens/Customer/Cart/Cart.js` |
| `Screens/Checkout/*` | `Screens/Customer/Checkout/*` |
| `Screens/Product/*` | `Screens/Customer/Home/*` |

---

## Navigator Changes Required

### 1. Main.js - Update imports
```javascript
// BEFORE
import UserNavigator from "./UserNavigator";

// AFTER
import CustomerNavigator from "./CustomerNavigator";
```

### 2. Rename UserNavigator.js → CustomerNavigator.js
```javascript
// CustomerNavigator.js - NEW NAME
const Stack = createStackNavigator();

const CustomerNavigator = () => {
    return (
        <Stack.Navigator>
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="Register" component={Register} />
            <Stack.Screen name="User Profile" component={UserProfile} />
            <Stack.Screen name="My Orders" component={MyOrders} />
            <Stack.Screen name="Notifications" component={NotificationCenter} />
        </Stack.Navigator>
    );
};
```

### 3. Main.js - Tab Configuration
```javascript
// Always show these tabs for all users:
<Tab.Screen name="Home" component={HomeNavigator} />
<Tab.Screen name="Cart" component={CartNavigator} />
<Tab.Screen name="User" component={CustomerNavigator} />

// Conditionally show Admin tab:
{isAdmin && <Tab.Screen name="Admin" component={AdminNavigator} />}
```

---

## Import Path Updates Needed

After moving files, update all imports in:

| File | Updates Required |
|------|------------------|
| `Navigators/Main.js` | Change `UserNavigator` → `CustomerNavigator` |
| `Navigators/CustomerNavigator.js` | Update paths to `../Customer/Auth/`, `../Customer/Profile/` |
| `Navigators/HomeNavigator.js` | Update paths to `../Customer/Home/` |
| `Screens/Customer/Cart/Cart.js` | Update redux import paths |
| `Screens/Customer/Checkout/*` | Update imports |
| `Screens/Customer/Profile/*` | Update imports |

---

## Rollback Plan (If Needed)

1. Keep original `Screens/` as backup
2. Create new structure first
3. Test thoroughly
4. Delete old structure only after verification

---

## Benefits

1. **Clear Role Separation** - Admins see Admin tab, Customers don't
2. **Maintainability** - Easy to find files by role
3. **Security** - Clear boundaries for permission checks
4. **Scalability** - Can add role-specific features easily

---

## Estimated Effort

- Create folders: 1 min
- Move files: 5-10 min
- Update imports: 10-15 min
- Test navigation: 5 min

**Total: ~20-30 minutes**
