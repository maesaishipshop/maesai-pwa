// src/api/driver.api.js
// Maesai Market — Driver Axios Instance
// Memory token pattern เหมือน buyer.api.js / seller.api.js

import axios from 'axios';
import { BACKEND_URL, toImgUrl } from '../utils/imageUrl';

// Proxy ใน dev: React dev server (3001) forward /api → backend (3000)
const API_BASE = process.env.REACT_APP_API_URL || '/api';

export { BACKEND_URL, toImgUrl };

/* ─── In-memory token storage ─────────────────────── */
let _accessToken = null;

export function setToken(token)  { _accessToken = token; }
export function clearToken()     { _accessToken = null; }
export function getToken()       { return _accessToken; }

/* ─── Axios instance ──────────────────────────────── */
const driverApi = axios.create({
  baseURL:         API_BASE,
  withCredentials: true,
  timeout:         15000,
});

/* ─── REQUEST interceptor ─────────────────────────── */
driverApi.interceptors.request.use((config) => {
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

driverApi.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    // ข้าม refresh interceptor สำหรับ auth endpoints ทุกรูปแบบ
    // ป้องกัน 401 loop เมื่อ login fail หรือ refresh fail
    const reqUrl = original.url || '';
    const isAuthEndpoint =
      reqUrl.includes('/auth/') ||
      reqUrl.includes('/auth/driver') ||
      reqUrl.includes('/driver/login') ||
      reqUrl.includes('/driver/register') ||
      reqUrl.includes('/driver/refresh');

    if (err.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      if (_refreshing) {
        return new Promise((resolve, reject) => {
          _queue.push({ resolve, reject });
        }).then((token) => {
          original.headers['Authorization'] = `Bearer ${token}`;
          return driverApi(original);
        });
      }

      original._retry = true;
      _refreshing = true;

      try {
        const res = await axios.post(
          '/api/auth/driver/refresh',
          {},
          { withCredentials: true }
        );
        // รองรับทั้ง { data: { accessToken } } และ { accessToken }
        const newToken = res.data.data?.accessToken || res.data.accessToken;
        setToken(newToken);
        processQueue(null, newToken);
        original.headers['Authorization'] = `Bearer ${newToken}`;
        return driverApi(original);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearToken();
        window.dispatchEvent(new CustomEvent('driver:logout'));
        return Promise.reject(refreshErr);
      } finally {
        _refreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export default driverApi;
