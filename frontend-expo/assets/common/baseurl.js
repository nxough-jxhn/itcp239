/**
 * Backend API base URL.
 * Priority:
 * 1) expo.extra.apiUrl from app.json/app.config
 * 2) local fallback host below
 */
import Constants from "expo-constants";

const FALLBACK_API_URL = "https://peakplay-backend.onrender.com/api/v1";

function normalizeApiUrl(value) {
	const raw = String(value || "").trim();
	if (!raw) return "";
	return raw.replace(/\/+$/, "");
}

const configuredApiUrl =
	Constants?.expoConfig?.extra?.apiUrl
	|| Constants?.manifest2?.extra?.expoClient?.extra?.apiUrl
	|| Constants?.manifest?.extra?.apiUrl
	|| "";

const baseURL = `${normalizeApiUrl(configuredApiUrl || FALLBACK_API_URL)}/`;

export default baseURL;
