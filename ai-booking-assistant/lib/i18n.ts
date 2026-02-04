export type LanguageCode = "DE" | "EN" | "ES"

export const defaultLanguage: LanguageCode = "DE"

export const languageLocales: Record<LanguageCode, string> = {
  DE: "de-DE",
  EN: "en-US",
  ES: "es-ES",
}

export const htmlLang: Record<LanguageCode, string> = {
  DE: "de",
  EN: "en",
  ES: "es",
}

export function getLocale(language: LanguageCode) {
  return languageLocales[language] || languageLocales[defaultLanguage]
}

export function formatTemplate(
  template: string,
  params: Record<string, string | number> = {}
) {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = params[key]
    return value === undefined ? match : String(value)
  })
}

const languageNames: Record<LanguageCode, Record<LanguageCode, string>> = {
  DE: { DE: "Deutsch", EN: "Englisch", ES: "Spanisch" },
  EN: { DE: "German", EN: "English", ES: "Spanish" },
  ES: { DE: "Aleman", EN: "Ingles", ES: "Espanol" },
}

export function getLanguageName(code: string, uiLanguage: LanguageCode) {
  if (code === "DE" || code === "EN" || code === "ES") {
    return languageNames[uiLanguage][code]
  }
  return code
}

export function getLanguageOptionLabel(code: LanguageCode, uiLanguage: LanguageCode) {
  return `${getLanguageName(code, uiLanguage)} (${code})`
}

const applicationStatusMap: Record<string, { DE: string; EN: string; ES: string }> = {
  Wartend: { DE: "Wartend", EN: "Pending", ES: "Pendiente" },
  Vorgeschrieben: { DE: "Vorgeschrieben", EN: "Drafted", ES: "Borrador" },
  Gesendet: { DE: "Gesendet", EN: "Sent", ES: "Enviado" },
  Fehler: { DE: "Fehler", EN: "Error", ES: "Error" },
}

export function getApplicationStatusLabel(status: string, language: LanguageCode) {
  return applicationStatusMap[status]?.[language] || status
}

const festivalStatusMap: Record<string, { DE: string; EN: string; ES: string }> = {
  Neu: { DE: "Neu", EN: "New", ES: "Nuevo" },
  Freigegeben: { DE: "Freigegeben", EN: "Approved", ES: "Aprobado" },
  Ignoriert: { DE: "Ignoriert", EN: "Ignored", ES: "Ignorado" },
}

export function getFestivalStatusLabel(status: string, language: LanguageCode) {
  return festivalStatusMap[status]?.[language] || status
}

const festivalSizeMap: Record<string, { DE: string; EN: string; ES: string }> = {
  Klein: { DE: "Klein", EN: "Small", ES: "Pequeno" },
  Mittel: { DE: "Mittel", EN: "Medium", ES: "Mediano" },
  Gross: { DE: "Gross", EN: "Large", ES: "Grande" },
}

export function getFestivalSizeLabel(size: string, language: LanguageCode) {
  return festivalSizeMap[size]?.[language] || size
}

const contactTypeMap: Record<string, { DE: string; EN: string; ES: string }> = {
  "E-Mail": { DE: "E-Mail", EN: "Email", ES: "Correo" },
  Formular: { DE: "Formular", EN: "Form", ES: "Formulario" },
  Unbekannt: { DE: "Unbekannt", EN: "Unknown", ES: "Desconocido" },
}

export function getContactTypeLabel(type: string, language: LanguageCode) {
  return contactTypeMap[type]?.[language] || type
}

const sourceMap: Record<string, { DE: string; EN: string; ES: string }> = {
  "Similar Band": { DE: "Aehnliche Band", EN: "Similar Band", ES: "Banda Similar" },
}

export function getSourceLabel(source: string, language: LanguageCode) {
  return sourceMap[source]?.[language] || source
}
