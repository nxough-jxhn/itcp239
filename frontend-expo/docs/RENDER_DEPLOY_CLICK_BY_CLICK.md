# Render Deployment (Click-by-Click)

This guide deploys only the backend first, then connects the app.

## A. Before You Start

1. Make sure backend runs locally with the new DB.
2. Confirm these local checks pass:
- Google register/login works.
- Products endpoint returns data.
- Health endpoint works.

## B. Create Backend Service on Render

1. Go to Render dashboard.
2. Click New +.
3. Click Web Service.
4. Connect your GitHub account if not connected.
5. Select your repo: itcp239-s-2026.
6. In service settings, set:
- Name: peakplay-backend (or your preferred name)
- Root Directory: backend
- Runtime: Node
- Build Command: npm install
- Start Command: npm start
- Region: nearest to you

7. Click Create Web Service.

## C. Add Environment Variables on Render

In Render service page:

1. Open Environment.
2. Add these keys and values:
- NODE_ENV=production
- PORT=10000
- API_PREFIX=/api/v1
- CONNECTION_STRING=<your atlas connection string>
- DB_NAME=<your new database name>
- JWT_SECRET=<same secret you use locally>
- JWT_EXPIRES_IN=7d
- CORS_ORIGIN=*
- UPLOAD_DIR=uploads
- MAX_FILE_SIZE_MB=15
- GOOGLE_CLIENT_ID=<your web client id>
- GOOGLE_CLIENT_IDS=<comma-separated ids>

3. Firebase push key setup:
- If you already committed the firebase admin json in backend folder, set FCM_SERVICE_ACCOUNT_PATH to that filename.
- If not committed, you must provide the file in a secure way first, then set FCM_SERVICE_ACCOUNT_PATH.

4. Click Save Changes.
5. Trigger redeploy if Render does not auto-redeploy.

## D. Verify Deployment

Use your Render URL, example:
- https://peakplay-backend.onrender.com

Check:

1. Health:
- GET /api/v1/health
- Expected: ok true

2. Products:
- GET /api/v1/products
- Expected: list returned

3. Google auth:
- POST /api/v1/users/auth/google
- Expected: token + user payload

If health works but other routes fail, check Render Logs.

## E. Point Frontend to Render Backend

1. Open app config at [frontend-expo/app.json](frontend-expo/app.json).
2. Update extra.apiUrl to:
- https://your-render-service.onrender.com/api/v1

3. Save file.

## F. Build New APK (Preview)

Inside frontend-expo:

1. Run: npx eas build -p android --profile preview
2. Install APK on phone.
3. Test using mobile data to ensure it no longer depends on local IP.

## G. Quick Regression After APK Install

1. Login (normal and Google).
2. Load products and product details.
3. Place order.
4. Update order status from admin.
5. Tap notification and verify it opens exact order details.
6. Update profile text and image.

## H. Common Render Issues

1. App crashes on boot:
- Usually missing env var.
- Check logs for missing CONNECTION_STRING, JWT_SECRET, or DB_NAME.

2. CORS blocked:
- Temporarily keep CORS_ORIGIN=* for testing.
- Later tighten to your known origins.

3. Slow first request:
- Free instance may sleep and cold start.

4. Google login fails only in production:
- Verify GOOGLE_CLIENT_IDS includes the correct client IDs.

---

Last updated: 2026-03-22
