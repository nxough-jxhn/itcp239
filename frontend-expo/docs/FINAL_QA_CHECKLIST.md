# Final QA Checklist (One-Pass Test)

Use this checklist for a single full test run before demo/submission.

Legend:
- [ ] Not tested
- [x] Passed
- [!] Failed / Needs fix

## A. Setup
- [xx] Backend server starts without crash
- [xx] Expo app starts and loads 
- [xx] Admin account available 
- [xx] Normal user account available 

## B. Auth + Session (Unit 2 JWT Secure Store)
- [xx] Register new normal user (manual register) 
- [xx] Login with new user 
- [xx] Force-close app and reopen -> still logged in
- [xx] Logout 

## C. User Profile + Photo (MP2)
- [xx] Update profile fields (name/phone/address)
- [xx] Upload profile image from gallery
- [xx] Capture profile image from camera - works but alert notif says failed but works fine
- [xx] Save profile -> values persist on reload 

## D. Admin Product CRUD + Camera (MP1)
- [xx] Add product with gallery image
- [xx] Add product with camera capture
- [xx] Edit product details
- [xx] Delete product
- [xx] Category CRUD still works

## E. Search/Filters (Quiz 1)
- [xx] Keyword search works
- [xx] Category filter works
- [xx] Price range slider works
- [xx] Combined search + category + price works
- [xx] Reset returns full list

## F. Cart Persistence + Checkout (MP4 + Term Test)
- [xx] Add items to cart
- [xx] Force-close app/reopen -> cart persists
- [xx] Checkout loads profile delivery data
- [xx] Confirm order -> order created
- [xx] Cart clears after successful order
- [xx] Force-close app/reopen -> cart remains empty

## G. Orders + Status Updates (Term Test)
- [xx] User sees own order in My Orders
- [xx] Admin sees order in Admin Orders
- [xx] Valid status update works
- [xx] User view reflects updated status

## H. Notifications (Quiz 2 + Term Test)
### H1. Order status notification
- [xx] User receives push after admin status update
- [xx] Tapping system notification opens Order Details

### H2. Promo broadcast
- [xx] Admin sends promo broadcast
- [xx] User receives promo push
- [xx] Tapping promo push opens notification detail/open flow

### H3. Notification center behaviors
- [xx] Notification Center lists active notifications
- [xx] Tapping list item redirects same as push tap
- [xx] Opened item appears in Recently Opened
- [x] Clear All clears active + opened sections

## I. Reviews/Ratings (MP3)
- [xx] Delivered order item shows Leave Review button
- [xx] User can submit review (rating/comment/media)
- [xx] Same user can edit own review
- [xx] Duplicate review for same order-product is blocked
- [xx] Review filters (with media/date/star) work
- [xx] Profanity masking works in displayed review text

## J. Redux Coverage (Quiz 3)
- [xx] Product list works through Redux state/actions
- [xx] Orders list works through Redux state/actions
- [xx] Order detail works through Redux state/actions
- [xx] Reviews load through Redux state/actions
- [xx] Home product section shows Redux loading/error fallback when API fails
- [xx] Catalog Search shows Redux loading/error fallback when API fails
- [xx] Single Product shows Redux error states for product detail and reviews

Quick test method for J:
1. Open app, then Home product list.
2. In backend terminal, stop server.
3. Pull-to-refresh or re-open each screen.
4. Expected evidence:
	- Product list screen now shows Redux-managed empty/error behavior after dispatch path executes.
	- Catalog Search screen shows Redux-managed empty/error behavior after dispatch path executes.
	- My Orders and Order Details show loading/error states from Redux slices.
	- Single Product screen shows product/review load failure paths from Redux slices.
5. Restart backend and verify data comes back after refresh.
6. Mark each J item [x] when its screen uses dispatch + selector flow and responds to server up/down.

## K. Unit 2 Push Token Handling
- [xx] Push token saved for logged-in user
- [xx] Notifications still send successfully
- [xx] Invalid/stale token cleanup code present in backend logs/flow

Quick test method for stale token cleanup:
1. Pick a test user in MongoDB (Compass or shell) and set:
	- pushToken: ExponentPushToken[stale_token_test_1234567890]
	- pushTokenType: expo
2. Trigger a notification send (admin promo notify or order status update).
3. Check backend terminal logs for lines like:
	- [notifications] Expo push sent...
	- [notifications] Cleared stale tokens: 1
4. Re-open the same user document and confirm pushToken and pushTokenType are cleared to empty strings.
5. Mark this item [x] once both log evidence and DB evidence are confirmed.

## L. Known On-Hold / Out of Scope
- [xx] Google login/register (Google/Facebook)

## M. Promo/Voucher Engine (Added Complexity)
- [xx] Admin promo manager supports create/edit/deactivate/reactivate campaign flow
- [xx] Voucher campaign type supported with code, usage policy, limits, min order, max discount
- [xx] Order pricing applies promo first, then voucher
- [xx] One voucher per order supported in checkout flow
- [xx] Voucher validation endpoint integrated into checkout confirm
- [xx] Promo/voucher push notifications route to Notification Center

## N. Resilience and Refresh UX
- [xx] Home catalog supports pull-to-refresh
- [xx] My Orders supports pull-to-refresh (list/empty/error)
- [xx] Product Details supports pull-to-refresh (product + reviews)
- [xx] Profile supports pull-to-refresh
- [xx] Cart supports pull-to-refresh (rehydrate persisted cart)
- [xx] Notifications already supports pull-to-refresh

## O. Requirements Risk Check (from ITCP239.txt)
- [xx] MP1 Product CRUD + camera/upload covered
- [xx] MP3 Reviews/Ratings + verified purchase covered
- [xx] MP4 SQLite cart persistence covered
- [xx] Quiz 1 search/filter requirements covered
- [xx] Quiz 2 notifications + detail routing covered
- [xx] Quiz 3 Redux product/order/review covered
- [xx] Unit 1 drawer UI covered
- [xx] Unit 2 JWT secure storage + push token stale cleanup covered
- [xx] MP2 social login (Google/Facebook)
- [ ] Term Test Lec scoring items (App complexity 10, Program contribution 10) need presentation evidence/docs

## P. Complexity Boost Reminder (Optional but strong for demo)
- [xx] Admin Overview page with key metrics cards (orders today, pending orders, low stock, active promos/vouchers)
- [xx] Sales snapshot (today/week revenue) and top products summary
- [xx] Simple analytics chart (orders per day, last 7 days)
- [xx] Admin quick actions panel (Orders, Products, Promo Manager, Stock Alerts)


## Final Decision
- [ ] READY FOR FULL DEMO / SUBMISSION
- [x] Needs another fix round
