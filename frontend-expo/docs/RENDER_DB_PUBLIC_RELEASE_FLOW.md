# Render + Database Switch + Public APK Flow

Use this exact flow now that your development APK is stable.

## Goal

- Switch to your new database now.
- Deploy backend publicly on Render.
- Build a non-localhost APK that uses Render API.
- Retest full app once on the new public stack.

## Why Switch DB Now

- You already need an APK rebuild when moving from local IP to Render URL.
- If you switch DB now, you avoid a second full QA/rebuild cycle later.
- If DB changes later but Render URL stays the same, APK rebuild is not required.

## Phase 0: Freeze and Backup (Do First)

1. Note current values:
- current DB name
- current backend URL
- current working APK profile

2. Backup current database:
- Use MongoDB Compass export or mongodump.
- Keep a rollback note with old DB_NAME.

3. Keep your current local setup untouched until final sign-off.

## Phase 1: Create and Prepare New Database

1. Create new DB name (example: ITCP_database_prod).
2. Import/seed only required demo data.
3. Verify required collections exist (users, products, categories, orders, promos, wishlist, reviews).
4. Verify admin account exists in new DB.

## Phase 2: Deploy Backend to Render

1. Create a Render Web Service for the backend folder.
2. Set build/start commands based on your backend project.
3. Add environment variables in Render:
- CONNECTION_STRING
- DB_NAME (new production DB)
- JWT_SECRET
- API_PREFIX
- CORS_ORIGIN
- MAX_FILE_SIZE_MB
- GOOGLE_CLIENT_ID or GOOGLE_CLIENT_IDS
- FCM_SERVICE_ACCOUNT_PATH (or your secure secret equivalent)

4. Deploy and wait until status is healthy.

## Phase 3: Backend Smoke Test (Before APK Rebuild)

Test these endpoints on Render URL:

1. Health check:
- GET /api/v1/health

2. Auth:
- login endpoint returns token

3. Core data:
- products endpoint returns list
- categories endpoint returns list

4. Profile:
- update profile endpoint works

5. Orders:
- order create works
- order status update works

6. Notifications:
- admin order status push route works

If these fail, fix backend first before rebuilding APK.

## Phase 4: Point Frontend to Render URL

Update API source to Render HTTPS URL:

1. Edit expo extra API URL in app config:
- file: frontend-expo/app.json
- field: expo.extra.apiUrl
- set to: https://your-render-service.onrender.com/api/v1

2. Confirm base URL resolver still reads app config first:
- file: frontend-expo/assets/common/baseurl.js

3. Ensure no local IP remains in active runtime config.

## Phase 5: Build Public Test APK

Inside frontend-expo:

1. Build preview/internal APK:
- npx eas build -p android --profile preview

2. Install on physical phone.
3. Test using mobile data (or a different Wi-Fi) to prove it is not LAN-locked.

## Phase 6: Full Retest Checklist (Public Stack)

Run all critical flows again on the new APK:

1. Auth
- login
- register
- google sign in

2. Catalog and pricing
- home products
- catalog search
- single product
- promo price/sale badges

3. Admin product media
- create product
- camera upload
- gallery upload
- multiple images

4. Cart and checkout
- add to cart
- checkout
- order appears

5. Orders and notifications
- admin update order status
- notification center receives entry
- admin tap opens exact order details
- user tap opens exact order details

6. Profile
- update text-only
- update image-only
- update both
- verify no false error toast on success

7. Stability
- pull-to-refresh under weak network
- ensure no crash/red screen

## Phase 7: Final Production Build

After preview QA passes:

1. Build production APK:
- npx eas build -p android --profile production

2. Quick smoke test on production APK.
3. Freeze deployment state for defense/demo.

## Fast Rollback Plan

If anything breaks after switch:

1. Revert Render DB_NAME to old DB.
2. Redeploy/restart backend.
3. Keep same Render URL so APK still works.

## Execution Notes

- Backend URL change requires APK rebuild.
- DB-only change on Render does not require APK rebuild.
- Always validate backend first, APK second.

---

Last updated: 2026-03-22
