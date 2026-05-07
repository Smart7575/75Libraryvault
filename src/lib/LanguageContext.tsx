
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, translations } from '../translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Default is English as requested
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    if (saved === 'en' || saved === 'nl') return saved;
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  const t = (path: string, params?: Record<string, string | number>): string => {
    const keys = path.split('.');
    
    const getFromObj = (obj: any, pathKeys: string[]) => {
      let current = obj;
      for (const key of pathKeys) {
        if (current && current[key] !== undefined) {
          current = current[key];
        } else {
          return null;
        }
      }
      return typeof current === 'string' ? current : null;
    };

    let result = getFromObj(translations[language], keys);
    
    // Fallback to English
    if (result === null && language !== 'en') {
      result = getFromObj(translations['en'], keys);
    }

    // Still nothing, return path
    if (result === null) {
      return path;
    }

    // Interpolate
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        const valStr = String(value);
        // Support both {{key}} and {key}
        result = result!
          .split(`{{${key}}}`).join(valStr)
          .split(`{${key}}`).join(valStr);
      });
    }

    return result!;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
