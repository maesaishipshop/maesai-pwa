# Chokdee Admin Access

## Admin Login URL
- Development: http://localhost:3001/admin-login
- Production: https://<railway-domain>/admin-login

## วิธีเข้าใช้งาน
1. ไปที่ URL ด้านบนโดยตรง
2. กรอก Email + Password
3. รอรับ OTP ทาง Email (6 หลัก หมดอายุใน 5 นาที)
4. กรอก OTP → เข้าระบบ

## Security
- ไม่มีปุ่มหรือ link ไปหน้า Admin ใน public UI
- เข้าได้ผ่าน URL โดยตรงเท่านั้น
- ต้องใช้ Email + Password + OTP (2FA)
- ล็อค 30 นาทีถ้ากรอกรหัสผิด 5 ครั้ง

## Development OTP
- OTP preview URL แสดงใน server terminal (Ethereal Email)
- ดู URL จาก console log: `[EMAIL] OTP preview URL: https://ethereal.email/...`

## Production
- ต้องตั้งค่า SMTP ใน environment variables:
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
