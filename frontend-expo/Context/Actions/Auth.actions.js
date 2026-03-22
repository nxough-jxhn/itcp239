import { jwtDecode } from 'jwt-decode';
import Toast from 'react-native-toast-message';
import baseURL from '../../assets/common/baseurl';
import { getJwtToken, setJwtToken, removeJwtToken } from '../../assets/common/authToken';

export const SET_CURRENT_USER = 'SET_CURRENT_USER';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function handleSocialAuthResponse(res, dispatch) {
  const raw = await res.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = {
      message: `Unexpected response (${res.status}): ${raw?.slice(0, 140) || 'empty body'}`,
    };
  }

  console.log('[socialAuth] backend status:', res.status, data?.message || 'ok');

  if (res.ok && data.token) {
    await setJwtToken(data.token);
    const decoded = jwtDecode(data.token);
    dispatch(setCurrentUser(decoded));
  } else {
    Toast.show({
      topOffset: 60,
      type: 'error',
      text1: data.message || 'Sign-in failed',
      text2: '',
    });
    dispatch(setCurrentUser({}));
  }
}

// ─── Google sign-in ──────────────────────────────────────────────────────────

/**
 * [MP2] Calls the Google OAuth prompt then POSTs the id_token to the backend.
 *
 * IMPORTANT:
 *   - Expo Go uses auth.expo.io proxy redirect for Google OAuth.
 *   - Web and standalone builds use their normal platform redirect flow.
 */
export const loginWithGoogle = async (promptAsync, dispatch, options = {}) => {
  try {
    if (options?.isExpoGoNative) {
      Toast.show({
        topOffset: 60,
        type: 'info',
        text1: 'Google sign-in needs a development build',
        text2: 'Expo Go (SDK 53+) does not fully support this flow.',
      });
      return;
    }

    const result = await promptAsync();

    // Targeted log: result type + whether we got a token
    console.log(
      '[loginWithGoogle] result type:', result?.type,
      '| params keys:', Object.keys(result?.params || {}),
    );

    // On native, promptAsync can return success with only `code`.
    // The hook response is completed asynchronously with `id_token`.
    if (result?.type === 'cancel' || result?.type === 'dismiss') return;
    if (result?.type === 'error') {
      Toast.show({
        topOffset: 60,
        type: 'error',
        text1: 'Google sign-in failed',
        text2: result?.error?.message || '',
      });
    }
  } catch (err) {
    console.error('[loginWithGoogle]', err);
    Toast.show({
      topOffset: 60,
      type: 'error',
      text1: 'Google sign-in failed',
      text2: err.message,
    });
    dispatch(setCurrentUser({}));
  }
};

export const loginWithGoogleIdToken = async (idToken, dispatch) => {
  let timeoutId;
  try {
    if (!idToken) return;

    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(`${baseURL}users/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      signal: controller.signal,
    });
    console.log('[loginWithGoogleIdToken] backend status:', res.status);
    await handleSocialAuthResponse(res, dispatch);
  } catch (err) {
    console.error('[loginWithGoogleIdToken]', err);

    const isTimeout = String(err?.name || '').toLowerCase() === 'aborterror';
    Toast.show({
      topOffset: 60,
      type: 'error',
      text1: 'Google sign-in failed',
      text2: isTimeout
        ? 'Request timed out. Check backend server and base URL connection.'
        : err.message,
    });
    dispatch(setCurrentUser({}));
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

// ─── Standard auth ───────────────────────────────────────────────────────────

export const loginUser = (user, dispatch) => {
  return fetch(`${baseURL}users/login`, {
    method: 'POST',
    body: JSON.stringify(user),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  })
    .then((res) => res.json())
    .then(async (data) => {
      if (data) {
        const token = data.token;
        await setJwtToken(token);
        const decoded = jwtDecode(token);
        dispatch(setCurrentUser(decoded, user));
      } else {
        logoutUser(dispatch);
      }
    })
    .catch((err) => {
      Toast.show({
        topOffset: 60,
        type: 'error',
        text1: 'Please provide correct credentials',
        text2: '',
      });
      console.log(err);
      logoutUser(dispatch);
    });
};

export const getUserProfile = (id) => {
  fetch(`${baseURL}users/${id}`, {
    method: 'GET',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  })
    .then((res) => res.json())
    .then((data) => console.log(data));
};

export const logoutUser = (dispatch) => {
  (async () => {
    try {
      const jwt = await getJwtToken();
      if (jwt) {
        await fetch(`${baseURL}users/push-token`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        });
      }
    } catch (_err) {
      // Logout should continue even if push token cleanup fails.
    }

    removeJwtToken();
  })();

  dispatch(setCurrentUser({}));
};

export const setCurrentUser = (decoded, user) => ({
  type: SET_CURRENT_USER,
  payload: decoded,
  userProfile: user,
});