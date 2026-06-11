// src/components/shared/FormInput.jsx
// Reusable form input with label and error message
// iOS fix: font-size ≥ 16px, WebkitAppearance: none, pointerEvents: auto

import React from 'react';

/* iOS safe inline styles — ใช้ร่วมกับ CSS class .input-field
   inline style มี specificity สูงกว่า class → override ได้ทันที */
const IOS_INPUT_STYLE = {
  fontSize: 16,               // iOS: ≥16px ป้องกัน auto-zoom เมื่อ focus
  WebkitAppearance: 'none',   // iOS: ลบ native styling (inline prop ใช้ camelCase)
  appearance: 'none',
  pointerEvents: 'auto',      // ป้องกัน parent ที่มี pointerEvents: none บัง input
  position: 'relative',       // ป้องกัน tap area ถูก clip จาก stacking context
  zIndex: 1,
  touchAction: 'manipulation', // ลด 300ms double-tap delay บน iOS
};

export default function FormInput({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  error,
  disabled = false,
  maxLength,
  inputStyle,  // prop สำหรับ caller ที่ต้องการ override style เพิ่มเติม
  children,
}) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      {children ? (
        children
      ) : (
        <input
          className="input-field"
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          disabled={disabled}
          maxLength={maxLength}
          // iOS safe styles รวม base + error override + caller override
          style={{
            ...IOS_INPUT_STYLE,
            ...(error ? { borderColor: 'var(--color-danger)' } : {}),
            ...(inputStyle || {}),
          }}
        />
      )}
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}
