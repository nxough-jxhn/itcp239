# PeakPlay Final APK Testing and Release Checklist

Use this checklist from your preview rebuild up to final production APK.

---

## 0) Pre-Flight Setup

- [x] Confirm backend runs locally with current test database (DB_NAME=ITCP_database).
- [x] Confirm frontend extra.apiUrl is currently local for local test pass.
- [ ] Confirm Google Android OAuth SHA-1 matches EAS keystore SHA-1.
- [ ] Confirm required keys exist in backend env:
  - [ ] CONNECTION_STRING
  - [ ] DB_NAME
  - [ ] JWT_SECRET
  - [ ] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_IDS
  - [ ] FCM_SERVICE_ACCOUNT_PATH
- [ ] Confirm no blocking editor errors.

---

## 1) Build Preview APK (Local Backend Validation)

### Command

Run inside frontend-expo folder:

npx eas build -p android --profile preview

### After build completes

- [x] Download and install APK on test device.
- [x] Open app and confirm splash logo and app branding are correct.
- [x] Confirm login screen branding is correct.
- [x] Confirm register screen branding is correct.

---

## 2) Local QA Pass (Still using ITCP_database)

### Auth and User

- [x] Login with existing user.
- [x] Register a new user.
- [x] Logout and login again.
- [x] Google sign-in works in APK.

### Product and Catalog

- [x] Categories load.
- [x] Product list loads.
- [x] Product details open without crash.
- [x] Search/filter works (if used in UI flow).

### Cart and Checkout

- [x] Add item to cart.
- [x] Update quantity.
- [x] Remove item.
- [x] Cart persists after app restart.
- [x] Checkout submit succeeds.
- [x] Order appears in user orders.

### Reviews and Wishlist

- [x] Add review.
- [x] Review list refreshes.
- [x] Add to wishlist.
- [x] Remove from wishlist.

- NO SALE INDICATOR on product containers x 
- MULTIPLE IMAGE not working, when selecting image, only one is able to be entered, create product not clickable x 
- NOTIFICATION ON ORDER STATUS, IS NOT SAVED ON NOTIFICATION CENTER x 

### Notifications

- [x] Push/local notification appears.
- [x] Notification Center lists notification.
- [x] Tapping notification routes to correct screen.
- [x] Notification detail payload (title/body) is preserved.

### Admin (if required for demo)

- [x] Admin login works.
- [x] Product CRUD works.
- [x] Category CRUD works.
- [x] Promo features work.
- [x] Order management screen works.

### Stability

- [!] No red screen crashes. - app crashes, maybe due to slow internet
- [x] No infinite loaders.
- [x] No critical backend 500 errors in logs.

---

## 3) Prepare Backend for Render

- [ ] Create Render service for backend.
- [ ] Set start command correctly.
- [ ] Configure all environment variables in Render:
  - [ ] NODE_ENV=production
  - [ ] PORT
  - [ ] API_PREFIX
  - [ ] CONNECTION_STRING
  - [ ] DB_NAME (keep ITCP_database for current dataset)
  - [ ] JWT_SECRET
  - [ ] JWT_EXPIRES_IN
  - [ ] CORS_ORIGIN
  - [ ] UPLOAD_DIR
  - [ ] MAX_FILE_SIZE_MB
  - [ ] GOOGLE_CLIENT_ID and/or GOOGLE_CLIENT_IDS
  - [ ] FCM service account configuration
- [ ] Deploy and wait for healthy status.
- [ ] Verify public API base URL responds.

---

## 4) Backend Smoke Test on Render

- [ ] Test login endpoint on public backend.
- [ ] Test products endpoint.
- [ ] Test order creation endpoint.
- [ ] Confirm MongoDB writes are visible in correct database.
- [ ] Confirm backend logs are readable and show expected route actions.

---

## 5) Point Frontend to Render URL

- [ ] Update frontend API URL to Render API URL.
- [ ] Confirm no local IP remains in active API config used by builds.
- [ ] Rebuild APK again using preview profile:

npx eas build -p android --profile preview

- [ ] Install new preview APK.

---

## 6) Remote Network Test (Important)

Use a device on a different network (mobile data or another Wi-Fi):

- [ ] Open app and load products from Render backend.
- [ ] Login works remotely.
- [ ] Checkout works remotely.
- [ ] Notifications and notification routing still work.
- [ ] No hard dependency on local laptop IP.

---

## 7) Final Release Readiness Gate

Proceed only if all are true:

- [ ] Core user flow passes (auth -> browse -> cart -> checkout -> order history).
- [ ] Admin flow passes (if included in grading/demo).
- [ ] Google sign-in works in APK.
- [ ] Notification flow works end-to-end.
- [ ] No critical backend errors.
- [ ] Branding and icon/splash are correct.

---

## 8) Build Final Production APK

### Command

npx eas build -p android --profile production

### Final validation

- [ ] Install production APK.
- [ ] Quick smoke test (login, products, checkout).
- [ ] Confirm app version/build number updated as expected.

---

## 9) Final Submission Pack

- [ ] Final APK link/file ready.
- [ ] Render backend URL documented.
- [ ] Test account credentials prepared for evaluator.
- [ ] Short demo script prepared (2 to 5 minutes).
- [ ] Known limitations documented (if any).

---

## 10) Sign-Off

- [ ] Student sign-off complete.
- [ ] Final QA date logged.
- [ ] Ready for defense/demo/submission.

Name: ____________________

Date: ____________________

Version tested: ____________________

Backend URL: ____________________
