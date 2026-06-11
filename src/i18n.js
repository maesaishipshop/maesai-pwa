// src/i18n.js
// Maesai Market — i18n Setup (ไทย / English / မြန်မာ)

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import th from './locales/th.json';
import en from './locales/en.json';
import my from './locales/my.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      th: { translation: th },
      en: { translation: en },
      my: { translation: my },
    },
    fallbackLng: 'th',
    defaultNS: 'translation',
    interpolation: { escapeValue: false },
    detection: {
      // detect จาก localStorage key "mm_lang" ก่อน
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'mm_lang',
      caches: ['localStorage'],
    },
  });

export default i18n;
