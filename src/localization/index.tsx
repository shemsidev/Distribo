import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ApiError, NetworkError } from '@/services/api/errors';

import { en } from './en';
import { sq, type Translations } from './sq';

export type Language = 'sq' | 'en';

export const languages: { code: Language; label: string }[] = [
  { code: 'sq', label: 'Shqip' },
  { code: 'en', label: 'English' },
];

const dictionaries: Record<Language, Translations> = { sq, en };
const STORAGE_KEY = 'distribo.language';

let currentLanguage: Language = 'sq';

/** Përkthimet e gjuhës aktive për kod jashtë React-it (p.sh. dialogët). Në komponentë përdor useT(). */
export function t(): Translations {
  return dictionaries[currentLanguage];
}

export function getLanguage(): Language {
  return currentLanguage;
}

/** Mesazh i kuptueshëm për përdoruesin nga çdo gabim i API-së ose i rrjetit. */
export function errorMessage(error: unknown): string {
  const tr = t();
  if (error instanceof NetworkError) {
    if (error.reason === 'timeout') return tr.common.timeout;
    if (error.reason === 'offline') return tr.common.offlineAction;
    return tr.common.unreachable;
  }
  if (error instanceof ApiError) {
    if (error.status === 401 && error.code !== 'invalid_credentials') return tr.common.sessionExpired;
    return tr.errors[error.code] ?? (currentLanguage === 'sq' ? error.message : tr.common.errorGeneric);
  }
  return tr.common.errorGeneric;
}

interface LocalizationValue {
  language: Language;
  tr: Translations;
  setLanguage: (language: Language) => void;
}

const LocalizationContext = createContext<LocalizationValue | null>(null);

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(currentLanguage);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'sq' || stored === 'en') {
          currentLanguage = stored;
          setLanguageState(stored);
        }
      })
      .catch(() => undefined);
  }, []);

  const setLanguage = useCallback((next: Language) => {
    currentLanguage = next;
    setLanguageState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const value = useMemo(() => ({ language, tr: dictionaries[language], setLanguage }), [language, setLanguage]);
  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export function useLocalization(): LocalizationValue {
  const ctx = useContext(LocalizationContext);
  if (!ctx) throw new Error('useLocalization duhet të përdoret brenda <LocalizationProvider>.');
  return ctx;
}

/** Përkthimet e gjuhës aktive; komponenti rirenderohet kur ndryshon gjuha. */
export function useT(): Translations {
  return useLocalization().tr;
}
