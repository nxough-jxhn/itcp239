# Final QA Checklist (One-Pass Test)

Use this checklist for a single full test run before demo/submission.

Legend:
- [ ] Not tested
- [x] Passed
- [!] Failed / Needs fix

## A. Setup
- [x] Backend server starts without crash
- [x] Expo app starts and loads
- [x] Admin account available
- [x] Normal user account available

## B. Auth + Session (Unit 2 JWT Secure Store)
- [x] Register new normal user (manual register)
- [x] Login with new user
- [x] Force-close app and reopen -> still logged in
- [x] Logout

## C. User Profile + Photo (MP2)
- [x] Update profile fields (name/phone/address)
- [x] Upload profile image from gallery
- [x] Capture profile image from camera
- [x] Save profile -> values persist on reload

## D. Admin Product CRUD + Camera (MP1)
- [x] Add product with gallery image
- [x] Add product with camera capture
- [x] Edit product details
- [x] Delete product
- [x] Category CRUD still works

## E. Search/Filters (Quiz 1)
- [x] Keyword search works
- [x] Category filter works
- [x] Price range slider works
- [x] Combined search + category + price works
- [x] Reset returns full list

## F. Cart Persistence + Checkout (MP4 + Term Test)
- [x] Add items to cart
- [x] Force-close app/reopen -> cart persists
- [x] Checkout loads profile delivery data
- [x] Confirm order -> order created
- [x] Cart clears after successful order
- [x] Force-close app/reopen -> cart remains empty

## G. Orders + Status Updates (Term Test)
- [x] User sees own order in My Orders
- [x] Admin sees order in Admin Orders
- [x] Valid status update works
- [x] User view reflects updated status

## H. Notifications (Quiz 2 + Term Test)
### H1. Order status notification
- [x] User receives push after admin status update
- [x] Tapping system notification opens Order Details

### H2. Promo broadcast
- [x] Admin sends promo broadcast
- [x] User receives promo push
- [x] Tapping promo push opens notification detail/open flow

### H3. Notification center behaviors
- [x] Notification Center lists active notifications
- [x] Tapping list item redirects same as push tap
- [x] Opened item appears in Recently Opened
- [x] Clear All clears active + opened sections

## I. Reviews/Ratings (MP3)
- [x] Delivered order item shows Leave Review button
- [x] User can submit review (rating/comment/media)
- [x] Same user can edit own review
- [x] Duplicate review for same order-product is blocked
- [x] Review filters (with media/date/star) work
- [x] Profanity masking works in displayed review text

## J. Redux Coverage (Quiz 3)
- [x] Product list works through Redux state/actions
- [x] Orders list works through Redux state/actions
- [x] Order detail works through Redux state/actions
- [x] Reviews load through Redux state/actions

Quick test method for J (no code changes needed):
1. Open app, then Home product list.
2. In backend terminal, stop server.
3. Pull-to-refresh or re-open each screen.
4. Expected evidence:
	- Product list screen now shows Redux-managed empty/error behavior after dispatch path executes.
	- My Orders and Order Details show loading/error states from Redux slices.
	- Single Product review area shows "No reviews yet for selected filter" or review load failure path after dispatch.
5. Restart backend and verify data comes back after refresh.
6. Mark each J item [x] when its screen uses dispatch + selector flow and responds to server up/down.

## K. Unit 2 Push Token Handling
- [x] Push token saved for logged-in user
- [x] Notifications still send successfully
- [x] Invalid/stale token cleanup code present in backend logs/flow

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
- [x] Google login/register (Google/Facebook)

## M. Promo/Voucher Engine (Added Complexity)
- [x] Admin promo manager supports create/edit/deactivate/reactivate campaign flow
- [x] Voucher campaign type supported with code, usage policy, limits, min order, max discount
- [x] Order pricing applies promo first, then voucher
- [x] One voucher per order supported in checkout flow
- [x] Voucher validation endpoint integrated into checkout confirm
- [x] Promo/voucher push notifications route to Notification Center

## N. Resilience and Refresh UX
- [x] Home catalog supports pull-to-refresh
- [x] My Orders supports pull-to-refresh (list/empty/error)
- [x] Product Details supports pull-to-refresh (product + reviews)
- [x] Profile supports pull-to-refresh
- [x] Cart supports pull-to-refresh (rehydrate persisted cart)
- [x] Notifications already supports pull-to-refresh

## O. Requirements Risk Check (from ITCP239.txt)
- [x] MP1 Product CRUD + camera/upload covered
- [x] MP3 Reviews/Ratings + verified purchase covered
- [x] MP4 SQLite cart persistence covered
- [x] Quiz 1 search/filter requirements covered
- [x] Quiz 2 notifications + detail routing covered
- [x] Quiz 3 Redux product/order/review covered
- [x] Unit 1 drawer UI covered
- [x] Unit 2 JWT secure storage + push token stale cleanup covered
- [x] MP2 social login (Google/Facebook)
- [ ] Term Test Lec scoring items (App complexity 10, Program contribution 10) need presentation evidence/docs

## P. Complexity Boost Reminder (Optional but strong for demo)
- [ ] Admin Overview page with key metrics cards (orders today, pending orders, low stock, active promos/vouchers)
- [ ] Sales snapshot (today/week revenue) and top products summary
- [ ] Simple analytics chart (orders per day, last 7 days)
- [ ] Admin quick actions panel (Orders, Products, Promo Manager, Stock Alerts)
- [ ] Presentation notes prepared: map these features to Term Test Lec (App complexity + program contribution)

## Final Decision
- [ ] READY FOR FULL DEMO / SUBMISSION
- [x] Needs another fix round
