/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'
import i18n from 'i18next'
import { initReactI18next, useTranslation } from 'react-i18next'
import HttpBackend from 'i18next-http-backend'
import LanguageDetector from 'i18next-browser-languagedetector'

export type Locale = 'en' | 'bn' | 'zh' | 'hi' | 'es' | 'fr' | 'ar' | 'ru' | 'pt' | 'id' | 'ur' | 'de' | 'ja' | 'sw' | 'tr'

// Determine translation keys dynamically from the English JSON without bundling it
import type enTranslation from '../public/locales/en/translation.json'
export type TranslationKey = keyof typeof enTranslation | string

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'bn', 'zh', 'hi', 'es', 'fr', 'ar', 'ru', 'pt', 'id', 'ur', 'de', 'ja', 'sw', 'tr'],
    backend: {
      loadPath: '/locales/{{lng}}/translation.json',
    },
    interpolation: {
      escapeValue: false,
    },
  });

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  toggleLocale: () => void
  t: (key: TranslationKey, options?: Record<string, unknown>) => string
  tNum: (num: string | number) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function convertToBanglaNumerals(num: string | number): string {
  const numStr = String(num)
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']
  return numStr.replace(/\d/g, (digit) => banglaDigits[parseInt(digit, 10)]!)
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const { t: translate, i18n: i18nInstance } = useTranslation()
  const locale = (i18nInstance.language?.split('-')[0] || 'en') as Locale

  useEffect(() => {
    document.documentElement.lang = locale
    if (['ar', 'ur'].includes(locale)) {
      document.documentElement.dir = 'rtl'
    } else {
      document.documentElement.dir = 'ltr'
    }
  }, [locale])

  const setLocale = useCallback(
    (nextLocale: Locale) => {
      void i18nInstance.changeLanguage(nextLocale)
      window.dispatchEvent(
        new CustomEvent('equipulse-tour-action', { detail: { action: 'locale-changed' } })
      )
    },
    [i18nInstance]
  )

  const toggleLocale = useCallback(() => {
    const nextLocale = locale === 'en' ? 'bn' : 'en'
    void i18nInstance.changeLanguage(nextLocale)
    window.dispatchEvent(
      new CustomEvent('equipulse-tour-action', { detail: { action: 'locale-changed' } })
    )
  }, [locale, i18nInstance])

  const t = useCallback(
    (key: TranslationKey, options?: Record<string, unknown>) => translate(key as string, { defaultValue: key as string, ...options }),
    [translate]
  )

  const tNum = useCallback(
    (num: string | number) => {
      const str = String(num)
      if (locale === 'bn') {
        return convertToBanglaNumerals(str)
      }
      return str
    },
    [locale],
  )

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      t,
      tNum,
    }),
    [locale, setLocale, t, toggleLocale, tNum],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const value = useContext(I18nContext)

  if (!value) {
    throw new Error('useI18n must be used within I18nProvider.')
  }

  return value
}
