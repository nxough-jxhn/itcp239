# Pages Needed for PeakPlay E-Commerce App

## Customer Pages

| Page | Purpose | Status |
|------|---------|--------|
| **Login** | Sign in (email/password + social) | Done | DONE UI
| **Signup** | Create account | Done | DONE UI
| **Home** | Carousel, brand filters, search bar, product grid | Done |
| **Search** | Search results, filters | Implemented (inside ProductContainer) | 
| **Category Page** | Products filtered by category | Implemented (CategoryFilter) |
| **Product Details** | Single product view, add to cart, reviews | Done |
| **Cart** | Cart items, quantities, checkout button | Done | DONE UI
| **Checkout** | Address, payment, confirm | Done | 
| **Profile** | User profile, edit, logout | Done |
| **My Orders** | Order history, status | Done | DONE UI
| **Wishlist** | Saved/favorite products | Not implemented |DONE UI

---

## Admin Pages

| Page | Purpose | Status |
|------|---------|--------|
| **Admin Dashboard** | Overview (orders, products, etc.) | Partial |
| **Products List** | View all products, edit/delete | Done |
| **Product Form** | Add/Edit product | Done |
| **Categories** | Manage categories | Done |
| **Orders** | View all orders, update status | Done |
| **Stock Alerts** | Low stock notifications | Done |
| **Promo Broadcast** | Send promo/discount push notifications | Not implemented |

---

## Notes

- **Drawer** is available on all main app screens (Home, Cart, Profile, etc.). Open by swiping from the left edge or tapping the grid icon on the Home header.
- Carousel uses 3 images, auto-slides every 3 seconds.
- Search bar is on its own full-width row above the product list.


Admin stack screens (all still mostly legacy/default-header style):
Dashboard.js
Products.js - DONE
ProductForm.js - DONE
Orders.js - DONE and details DONE
Categories.js - DONE
StockAlerts.js - DONE - add product with 0 stocks on the list and add edit button to change stocks.
PromoBroadcast.js - when inactive shouldnt be able to click the notify users, react button not working
ListItem.js

Legacy product components present but likely not currently active in main customer flow:
CategoryFilter.js
ProductList.js
SearchedProduct.js

