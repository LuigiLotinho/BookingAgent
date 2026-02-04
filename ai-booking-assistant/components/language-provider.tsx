"use client"

import React from "react"
import {
  defaultLanguage,
  getLocale,
  htmlLang,
  type LanguageCode,
} from "@/lib/i18n"

const STORAGE_KEY = "bandbooker.language"

type LanguageContextValue = {
  language: LanguageCode
  setLanguage: (language: LanguageCode) => void
  locale: string
  formatNumber: (value: number) => string
}

const LanguageContext = React.createContext<LanguageContextValue | undefined>(
  undefined
)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = React.useState<LanguageCode>(
    defaultLanguage
  )

  React.useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === "DE" || stored === "EN" || stored === "ES") {
      setLanguageState(stored)
    }
  }, [])

  const locale = React.useMemo(() => getLocale(language), [language])

  React.useEffect(() => {
    document.documentElement.lang = htmlLang[language]
  }, [language])

  const setLanguage = React.useCallback((next: LanguageCode) => {
    setLanguageState(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }, [])

  const formatNumber = React.useCallback(
    (value: number) => new Intl.NumberFormat(locale).format(value),
    [locale]
  )

  const value = React.useMemo(
    () => ({ language, setLanguage, locale, formatNumber }),
    [language, setLanguage, locale, formatNumber]
  )

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = React.useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider")
  }
  return context
}
