import ar from './ar.json'
import en from './main.json'
import fr from './fr.json'
import it from './it.json'
import ja from './ja.json'
import ko_kr from './ko-kr.json'
import no from './no.json'
import zh_cn from './zh-cn.json'
import tr from './tr.json'
import es from './es.json'
import pl from './pl.json'
import pt_br from './pt-br.json'

// The default language (english) must have a value for every message.
// Other languages may have missing messages. If the application finds
// a missing message for the current language, it will use the english
// translation instead.

export const TRANSLATIONS: TDTranslations = [
  { code: 'ar', label: 'عربي', messages: ar },
  { code: 'en', label: 'English', messages: en },
  { code: 'es', label: 'Español', messages: es },
  { code: 'fr', label: 'Français', messages: fr },
  { code: 'it', label: 'Italiano', messages: it },
  { code: 'ja', label: '日本語', messages: ja },
  { code: 'ko-kr', label: '한국어', messages: ko_kr },
  { code: 'no', label: 'Norwegian', messages: no },
  { code: 'pl', label: 'Polski', messages: pl },
  { code: 'tr', label: 'Türkçe', messages: tr },
  { code: 'zh-cn', label: 'Chinese - Simplified', messages: zh_cn },
  { code: 'pt-br', label: 'Português - Brasil', messages: pt_br },
]

/* ----------------- (do not change) ---------------- */

TRANSLATIONS.sort((a, b) => (a.code < b.code ? -1 : 1))

export type TDTranslation = {
  readonly code: string
  readonly label: string
  readonly messages: Partial<typeof en>
}

export type TDTranslations = TDTranslation[]

export type TDLanguage = TDTranslations[number]['code']
