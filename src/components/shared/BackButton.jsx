// src/components/shared/BackButton.jsx
// Reusable back button for top-bar

import React from 'react';

export default function BackButton({ onClick }) {
  return (
    <button className="top-bar-back" onClick={onClick}>
      ‹
    </button>
  );
}
