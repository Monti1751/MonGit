import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationES from './locales/es.json';
import translationEN from './locales/en.json';

const resources = {
  en: {
    translation: translationEN
  },
  es: {
    translation: translationES
  }
};

// Detectar idioma guardado en localStorage o detectar automáticamente
const savedLanguage = localStorage.getItem('preferred-language');
const detectedLanguage = savedLanguage || navigator.language?.split('-')[0] || 'es';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: detectedLanguage,
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false // react already safes from xss
    },
    react: {
      useSuspense: false,
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true
    }
  });

// Guardar el idioma cuando cambia
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('preferred-language', lng);
});

export default i18n;
