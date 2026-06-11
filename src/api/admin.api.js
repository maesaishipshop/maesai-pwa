// src/api/admin.api.js
// Maesai Market — Admin Axios Instance
// Memory token pattern เหมือน seller/buyer/driver
// baseURL ชี้ตรงไป backend เพื่อข้าม setupProxy

import axios from 'axios';

// BACKEND_URL = '' → รูปใช้ relative path (/uploads/...) → ผ่าน proxy ได้
export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
// Proxy ใน dev: React dev server (3001) forward /api → backend (3000)
const API_BASE           = process.env.REACT_APP_API_URL    || '/api';

export function toImgUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BACKEND_URL}${path}`;
}

/* ─── In-memory token storage ─────────────────────── */
let _accessToken = null;

export function setToken(token) { _accessToken = token; }
export function clearToken()    { _accessToken = null; }
export function getToken()      { return _accessToken; }

/* ─── Axios instance ──────────────────────────────── */
const adminApi = axios.create({
  baseURL:         API_BASE,
  withCredentials: true,
  timeout:         15000,
});

/* ─── REQUEST interceptor ─────────────────────────── */
adminApi.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers['Authorization'] = `Bearer ${_accessToken}`;
  }
  return config;
});

/* ─── RESPONSE interceptor: 401 → refresh → retry ── */
let _refreshing = false;
let _queue = [];

function processQueue(error, token = null) {
  _queue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  _queue = [];
}

adminApi.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    // ข้าม refresh interceptor สำหรับ admin auth endpoints
    // admin ใช้ /admin/login, /admin/verify-otp, /admin/refresh (ไม่มี /auth/)
    const reqUrl = original.url || '';
    const isAuthEndpoint =
      reqUrl.includes('/auth/')         ||
      reqUrl.includes('/admin/login')   ||
      reqUrl.includes('/admin/verify-otp') ||
      reqUrl.includes('/admin/refresh');

    if (err.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      if (_refreshing) {
        return new Promise((resolve, reject) => {
          _queue.push({ resolve, reject });
        }).then((token) => {
          original.headers['Authorization'] = `Bearer ${token}`;
          return adminApi(original);
        });
      }

      original._retry = true;
      _refreshing = true;

      try {
        const res = await axios.post(
          '/api/admin/refresh',
          {},
          { withCredentials: true }
        );
        // Bug fix: backend ส่ง { success, data: { accessToken } } → ต้องอ่าน data.data.accessToken
        const newToken = res.data?.data?.accessToken || res.data?.accessToken;
        setToken(newToken);
        processQueue(null, newToken);
        original.headers['Authorization'] = `Bearer ${newToken}`;
        return adminApi(original);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearToken();
        window.dispatchEvent(new CustomEvent('admin:logout'));
        return Promise.reject(refreshErr);
      } finally {
        _refreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export default adminApi;
