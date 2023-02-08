import en from './en.json'
import ko_kr from './ko-kr.json'
import main from './main.json'

// The default language (english) must have a value for every message.
// Other languages may have missing messages. If the application finds
// a missing message for the current language, it will use the english
// translation instead.

export const TRANSLATIONS: TDTranslations = [
  // { locale: 'ar', label: 'عربي', messages: ar },
  // { locale: 'da', label: 'Danish', messages: da },
  // { locale: 'de', label: 'Deutsch', messages: de },
  { locale: 'en', label: 'English', messages: en },
  // { locale: 'es', label: 'Español', messages: es },
  // { locale: 'fa', label: 'فارسی', messages: fa },
  // { locale: 'fr', label: 'Français', messages: fr },
  // { locale: 'he', label: 'עברית', messages: he },
  // { locale: 'it', label: 'Italiano', messages: it },
  // { locale: 'ja', label: '日本語', messages: ja },
  { locale: 'ko-kr', label: '한국어', messages: ko_kr },
  // { locale: 'ne', label: 'नेपाली', messages: ne },
  // { locale: 'no', label: 'Norwegian', messages: no },
  // { locale: 'pl', label: 'Polski', messages: pl },
  // { locale: 'pt', label: 'Português - Europeu', messages: pt_pt },
  // { locale: 'pt-br', label: 'Português - Brasil', messages: pt_br },
  // { locale: 'ru', label: 'Russian', messages: ru },
  // { locale: 'sv', label: 'Svenska', messages: sv },
  // { locale: 'tr', label: 'Türkçe', messages: tr },
  // { locale: 'uk', label: 'Ukrainian', messages: uk },
  // { locale: 'zh-ch', label: '简体中文', messages: zh_cn },
  // { locale: 'zh-tw', label: '繁體中文 (台灣)', messages: zh_tw },
  // { locale: 'th', label: 'ภาษาไทย', messages: th },
]

/* ----------------- (do not change) ---------------- */

TRANSLATIONS.sort((a, b) => (a.locale < b.locale ? -1 : 1))

export type TDTranslation = {
  readonly locale: string
  readonly label: string
  readonly messages: Partial<typeof main>
}

export type TDTranslations = TDTranslation[]

export type TDLanguage = TDTranslations[number]['locale']

export function getTranslation(locale: TDLanguage): TDTranslation {
  const translation = TRANSLATIONS.find((t) => t.locale === locale)

  return {
    locale,
    label: translation?.label ?? locale,
    messages: {
      ...main,
      ...translation?.messages,
    },
  }
}
