# MAESAI MARKET — Frontend File Map (maesai-pwa)
> อัปเดตล่าสุด: 2026-06-11
> ทุกไฟล์ใน `src/` พร้อมหน้าที่โดยย่อ

---

## Frontend File Map

### Root

| path | หน้าที่ |
|------|---------|
| `src/index.js` | ReactDOM render, import `theme.css` |
| `src/App.js` | Routing หลัก — `useState('landing')` page state, token state ทุก actor, **persistent session auto-restore** (GET /api/auth/seller/me ตอน startup), loading screen, Admin URL guard (`?ref=Zw4Rk9mX2pQn7vLs`), logout event listeners |
| `src/i18n.js` | i18next setup + browser language detector, 3 locales (th/en/my), storage key `mm_lang` |
| `src/setupProxy.js` | CRA dev proxy — forward `/api` + `/uploads` → `http://localhost:3000`, **cookieDomainRewrite** สำหรับ httpOnly cookie |

---

### API Layer (`src/api/`)

| path | หน้าที่ |
|------|---------|
| `src/api/seller.api.js` | axios instance Seller — baseURL `/api`, **withCredentials:true** (httpOnly cookie), memory token, request interceptor (Bearer header), response interceptor (401 → refresh → retry), **token path fix** `res.data.data.accessToken` |
| `src/api/buyer.api.js` | axios instance Buyer — เหมือน seller.api.js, **withCredentials:true**, refresh ที่ `/auth/buyer/refresh` |
| `src/api/driver.api.js` | axios instance Driver — เหมือน seller.api.js, **withCredentials:true**, refresh ที่ `/auth/driver/refresh` |
| `src/api/admin.api.js` | axios instance Admin — เหมือน seller.api.js, **withCredentials:true**, refresh ที่ `/auth/admin/refresh` (path ต่างจาก role อื่น) |

> **Memory token pattern**: `export function setToken(t)`, `clearToken()`, `getToken()` — ไม่ใช้ localStorage (ป้องกัน XSS)

---

### Styles

| path | หน้าที่ |
|------|---------|
| `src/styles/theme.css` | Design System สีมรกต — CSS variables (--color-primary: #2D9B6E ฯลฯ), global reset, iOS fixes (-webkit-tap-highlight-color, touch-action), **`cursor: default` global + `user-select: none` (แก้ text cursor bug)**, re-enable สำหรับ input/textarea, classes: btn-primary/secondary/danger/ghost, card, badge-*, input-field (font-size:16px iOS zoom fix), form-group, page-container, top-bar, bottom-nav, content-area, toast, empty-state, loading-center |

---

### Shared Components (`src/components/shared/`)

| path | หน้าที่ |
|------|---------|
| `src/components/shared/FormInput.jsx` | Input field + label + error message — iOS fixes inline: `fontSize:16, WebkitAppearance:'none', touchAction:'manipulation', position:'relative', zIndex:1` — props: label, type, placeholder, value, onChange, error, onBlur, onFocus, inputStyle |
| `src/components/shared/BackButton.jsx` | ปุ่ม ← (chevron) กลับ — ใช้ร่วมกันทุก page ที่มี top-bar |

---

### Seller Components (`src/components/seller/`)

| path | หน้าที่ |
|------|---------|
| `src/components/seller/SellerBottomNav.jsx` | Bottom nav Seller — 5 tabs: Dashboard / สินค้า / คำสั่งซื้อ / แชท / โปรไฟล์ — **profileImage prop** แสดงรูปจริงแทน icon, **badge แชทสีแดง real-time** |
| `src/components/seller/ProductFormModal.jsx` | Modal form เพิ่ม/แก้ไขสินค้า — fields: name_th, price, unit, category_id, moq, stock, weight_per_unit, origin_country, description, รูปสินค้า (multi-upload), **video upload section** (🎥 อัปโหลด/เปลี่ยน/ลบ) |

---

### Buyer Components (`src/components/buyer/`)

| path | หน้าที่ |
|------|---------|
| `src/components/buyer/BuyerBottomNav.jsx` | Bottom nav Buyer — 4 tabs: หน้าแรก / คำสั่งซื้อ / แชท / โปรไฟล์ — **profileImage prop**, **badge แชทสีแดง real-time** |

---

### Driver Components (`src/components/driver/`)

| path | หน้าที่ |
|------|---------|
| `src/components/driver/DriverBottomNav.jsx` | Bottom nav Driver — 4 tabs: หน้าแรก / งานของฉัน / แชท / โปรไฟล์ — **profileImage prop**, **badge แชทสีแดง real-time** |

---

### Admin Components (`src/components/admin/`)

| path | หน้าที่ |
|------|---------|
| `src/components/admin/AdminBottomNav.jsx` | Bottom nav Admin — **6 tabs**: Dashboard / คำสั่งซื้อ / Driver / ผู้ใช้ / การเงิน / **💬 แชท** — chatUnread badge สีแดง |

---

### Common Pages (`src/pages/common/`)

| path | หน้าที่ |
|------|---------|
| `src/pages/common/LandingPage.jsx` | หน้าแรก — card เลือก Seller / Buyer / Driver (Admin ไม่มีปุ่ม เข้าทาง `?ref=Zw4Rk9mX2pQn7vLs` เท่านั้น), header มุมโค้ง เต็มจอ, i18n 3 ภาษา |

---

### Seller Pages (`src/pages/seller/`)

| path | หน้าที่ |
|------|---------|
| `src/pages/seller/SellerLoginPage.jsx` | Login Seller — phone + password, error handling (ACCOUNT_SUSPENDED / INVALID_CREDENTIALS) |
| `src/pages/seller/SellerRegisterPage.jsx` | Register Seller — phone, password, ชื่อร้าน, ที่อยู่ |
| `src/pages/seller/SellerApp.jsx` | Seller container — Socket.io (userType:'seller', events: new_order/order_cancelled/notification), badge unread count fetch on `accessToken`, sub-page routing, logout event listener |
| `src/pages/seller/SellerHomePage.jsx` | Dashboard Seller — stats (order วันนี้, รายได้รวม, รายได้สุทธิ-3%, รายได้รอรับ) คำนวณจาก GET /orders/seller |
| `src/pages/seller/SellerProductsPage.jsx` | จัดการสินค้า — list (primary_image + BACKEND_URL prefix), add/edit (ProductFormModal), toggle เปิด/ปิด, soft delete, **VideoModal** (🎥 badge, thumbnail, iOS-safe video player) |
| `src/pages/seller/SellerOrdersPage.jsx` | คำสั่งซื้อ Seller — list + filter status, **badge จำนวน order แต่ละ tab**, รับ/ปฏิเสธ, กด "เตรียมของแล้ว", **multi-select print** (selection mode, action bar, bulk print), **is_printed indicator** (✅ + วันเวลา) |
| `src/pages/seller/SellerChatPage.jsx` | แชท Seller — room list (unread badge), **driver_seller room** (badge 🚗), ปุ่ม **"👨‍💼 ติดต่อผู้ดูแลระบบ"**, chat window: ส่งข้อความ/รูป, long-press → แก้ไข/ลบ, socket events |
| `src/pages/seller/SellerProfilePage.jsx` | โปรไฟล์ Seller — รูปร้าน upload, GPS ปักหมุดตำแหน่งร้าน (OpenStreetMap/Leaflet), บัญชีธนาคาร, เปลี่ยนรหัสผ่าน |
| `src/pages/seller/SellerNotificationsPage.jsx` | การแจ้งเตือน — list notifications, mark read, sound toggle (Web Audio API beep on/off) |

---

### Buyer Pages (`src/pages/buyer/`)

| path | หน้าที่ |
|------|---------|
| `src/pages/buyer/BuyerLoginPage.jsx` | Login Buyer — phone + password, error handling |
| `src/pages/buyer/BuyerRegisterPage.jsx` | Register Buyer — phone, password, ชื่อ |
| `src/pages/buyer/BuyerApp.jsx` | Buyer container — Socket.io (userType:'buyer'), badge unread count fetch on `accessToken`, sub-page routing, logout event listener |
| `src/pages/buyer/BuyerHomePage.jsx` | Browse สินค้า — product grid 2 col, search (debounce), category filter chips (horizontal scroll), infinite scroll, navigate → ProductDetail |
| `src/pages/buyer/BuyerProductDetailPage.jsx` | รายละเอียดสินค้า — image gallery, promotion badge, MOQ qty picker, สั่งซื้อ (POST /orders), ปุ่มแชทกับ Seller, **video player + thumbnail** (🎥 ถ้ามี video_path), NaN fix ราคา |
| `src/pages/buyer/BuyerOrdersPage.jsx` | รายการ order Buyer — tab filter (all/pending/confirmed/delivering/completed/cancelled), status badges |
| `src/pages/buyer/BuyerOrderDetailPage.jsx` | รายละเอียด order — status timeline, ยกเลิก order, complete (รับสินค้าแล้ว), dispute (ปฏิเสธรับ), รีวิว Seller+Driver |
| `src/pages/buyer/BuyerChatPage.jsx` | แชท Buyer — room list (unread badge), **แยก admin room UI** (icon/badge แยก), ปุ่ม **"👨‍💼 ติดต่อผู้ดูแลระบบ"**, chat window, socket events |
| `src/pages/buyer/BuyerProfilePage.jsx` | โปรไฟล์ Buyer — GPS ที่อยู่จัดส่ง (OpenStreetMap), บัญชีธนาคาร, เปลี่ยนรหัสผ่าน, logout |

---

### Driver Pages (`src/pages/driver/`)

| path | หน้าที่ |
|------|---------|
| `src/pages/driver/DriverLoginPage.jsx` | Login Driver — phone + password, pending approval screen (ACCOUNT_PENDING_APPROVAL) |
| `src/pages/driver/DriverRegisterPage.jsx` | Register Driver — phone, password, ชื่อ, เลขใบขับขี่ |
| `src/pages/driver/DriverApp.jsx` | Driver container — Socket.io (userType:'driver'), badge unread count fetch on `accessToken`, sub-page routing, logout event listener |
| `src/pages/driver/DriverHomePage.jsx` | Dashboard Driver — งาน+รายได้วันนี้, รายการ available orders (ready_for_pickup), กดรับงาน |
| `src/pages/driver/DriverPickupPage.jsx` | Pickup flow — แสดง order detail, GPS current location, อัปโหลดรูปยืนยัน (min 2 รูป), POST /drivers/pickup |
| `src/pages/driver/DriverDeliverPage.jsx` | Deliver flow — แสดง order detail, GPS, อัปโหลดรูปยืนยัน (min 2 รูป), POST /drivers/deliver |
| `src/pages/driver/DriverEarningsPage.jsx` | รายได้ Driver — สรุปรายวัน, ประวัติ payout |
| `src/pages/driver/DriverHistoryPage.jsx` | ประวัติงาน Driver — รายการ completed orders ทั้งหมด |
| `src/pages/driver/DriverChatPage.jsx` | แชท Driver — room list (unread badge), **driver_seller room** (ห้องแชทกับ Seller อัตโนมัติหลังรับงาน), ปุ่ม **"👨‍💼 ติดต่อผู้ดูแลระบบ"**, chat window, socket events |
| `src/pages/driver/DriverProfilePage.jsx` | โปรไฟล์ Driver — รูปโปรไฟล์, GPS อัปเดต location real-time, เปลี่ยนรหัสผ่าน, logout |

---

### Admin Pages (`src/pages/admin/`)

| path | หน้าที่ |
|------|---------|
| `src/pages/admin/AdminLoginPage.jsx` | Login Admin — 2 step: (1) phone+password → (2) OTP 6 หลัก (2FA) — progress bar 2 step, dev bypass OTP `000000` |
| `src/pages/admin/AdminApp.jsx` | Admin container — Socket.io, **polling GET /chat/rooms ทุก 30 วิ** (chatUnread badge), sub-page routing, logout |
| `src/pages/admin/AdminDashboardPage.jsx` | Dashboard Admin — 8 stats cards, **Maintenance Mode toggle** (เปิด/ปิดระบบ), StatCard onClick → navigate ไป complaints page |
| `src/pages/admin/AdminOrdersPage.jsx` | คำสั่งซื้อ + Disputes — list orders (filter+search), รายละเอียด, resolve dispute |
| `src/pages/admin/AdminDriversPage.jsx` | จัดการ Driver — list (filter active/pending/blacklisted), approve (pending→active), blacklist, suspend/unsuspend |
| `src/pages/admin/AdminUsersPage.jsx` | จัดการ Seller/Buyer — tab switch, list (filter+search), suspend temporary/permanent, unsuspend |
| `src/pages/admin/AdminFinancePage.jsx` | การเงิน — Payout list (filter pending/approved/rejected), approve/reject individual, batch approve, platform revenue, Tax (calculateTax/finalizeTax/exportCSV/exportPDF) |
| `src/pages/admin/AdminComplaintsPage.jsx` | ร้องเรียน — filter tabs (ทั้งหมด/รอ/กำลังดำเนินการ/แก้ไขแล้ว), complaint card+detail view, textarea reply, ปุ่มบันทึก/ปิดเรื่อง — **Step 15-28** |
| `src/pages/admin/AdminChatPage.jsx` | แชท Admin — room list จาก Seller/Buyer/Driver (REST-only ไม่ใช้ socket), getRoomMeta helper, send text+image, seen ✓/✓✓, reset badge เมื่อเปิด tab — **Step 15-29** |

---

### Locales (`src/locales/`)

| path | หน้าที่ |
|------|---------|
| `src/locales/th.json` | คีย์แปลภาษา — ภาษาไทย (default) |
| `src/locales/en.json` | คีย์แปลภาษา — English |
| `src/locales/my.json` | คีย์แปลภาษา — မြန်မာဘာသာ (Burmese) |

> Namespace keys: `common`, `auth`, `landing`, `seller`, `product`, `order`, `driver`, `admin`
