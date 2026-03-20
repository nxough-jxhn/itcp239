# Screen Folder Reorganization Plan

## Current Structure

```
Screens/
├── Admin/
│   ├── Categories.js
│   ├── ListItem.js
│   ├── Orders.js
│   ├── ProductForm.js
│   ├── Products.js
│   └── StockAlerts.js
├── Cart/
│   └── Cart.js
├── Checkout/
│   ├── Checkout.js
│   ├── Confirm.js
│   └── Payment.js
├── Product/
│   ├── CategoryFilter.js
│   ├── ProductCard.js
│   ├── ProductContainer.js
│   ├── ProductList.js
│   ├── SearchedProduct.js
│   └── SingleProduct.js
└── User/
    ├── Login.js
    ├── MyOrders.js
    ├── NotificationCenter.js
    ├── Register.js
    └── UserProfile.js
```

## Proposed Structure

```
Screens/
├── Admin/                      # Admin-only pages (requires isAdmin: true)
│   ├── Categories.js           # Manage categories
│   ├── Orders.js              # View/manage all orders
│   ├── ProductForm.js         # Add/Edit products
│   ├── Products.js            # Manage products list
│   └── StockAlerts.js         # Stock notifications
│
└── Customer/                   # Customer/User pages (requires isAdmin: false)
    ├── Auth/
    │   ├── Login.js
    │   └── Register.js
    ├── Cart/
    │   └── Cart.js
    ├── Checkout/
    │   ├── Checkout.js
    │   ├── Confirm.js
    │   └── Payment.js
    ├── Home/
    │   ├── CategoryFilter.js
    │   ├── ProductCard.js
    │   ├── ProductContainer.js
    │   ├── ProductList.js
    │   ├── SearchedProduct.js
    │   └── SingleProduct.js
    ├── Orders/
    │   └── MyOrders.js
    ├── Profile/
    │   ├── UserProfile.js
    │   └── NotificationCenter.js
    └── Shared/
        └── (shared customer components)
```

## Navigation Changes Required

### Main.js (Tab Navigator)
```javascript
// Current: Mixed tabs based on role
// Proposed: Always show Home, Cart, User. Admin tab shows only for admins.

<Tab.Screen name="Home" component={HomeNavigator} />     // Customer
<Tab.Screen name="Cart" component={CartNavigator} />      // Customer
<Tab.Screen name="User" component={UserNavigator} />     // Customer
{isAdmin && <Tab.Screen name="Admin" component={AdminNavigator} />}
```

### Navigator Updates

| Current | Proposed |
|---------|----------|
| `UserNavigator.js` | `CustomerNavigator.js` (contains Auth + Profile + Orders) |
| `HomeNavigator.js` | Merged into `CustomerNavigator` or separate `HomeNavigator` |
| `AdminNavigator.js` | Stays as `AdminNavigator.js` |

## Implementation Steps

### Step 1: Create new folder structure
```
Screens/
├── Admin/
└── Customer/
    ├── Auth/
    ├── Cart/
    ├── Checkout/
    ├── Home/
    ├── Orders/
    └── Profile/
```

### Step 2: Move files
- Move `Screens/User/` → `Screens/Customer/Auth/` + `Screens/Customer/Profile/`
- Move `Screens/Product/` → `Screens/Customer/Home/`
- Move `Screens/Cart/` → `Screens/Customer/Cart/`
- Move `Screens/Checkout/` → `Screens/Customer/Checkout/`
- Move `Screens/Admin/` → Keep as is (or move to root Admin)

### Step 3: Update Navigator imports
- Update `Main.js` imports
- Update `CustomerNavigator.js` imports
- Update `AdminNavigator.js` imports

### Step 4: Test navigation works

## Benefits of This Structure

1. **Clear separation** - Admin vs Customer codebases are visually distinct
2. **Role-based access** - Easy to see which pages require which role
3. **Scalability** - Easy to add new features to either section
4. **Security** - Clear boundaries for role checking

## Notes

- The current `isAdmin` check happens in `Main.js` (line 20)
- Admin pages already have protection via `AdminNavigator.js` (lines 27-35)
- Customer pages need to check if user is logged in (already implemented in screens)
