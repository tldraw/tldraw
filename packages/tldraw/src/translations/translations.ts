import ar from './ar.json'
import da from './da.json'
import de from './de.json'
import en from './main.json'
import es from './es.json'
import fa from './fa.json'
import fr from './fr.json'
import it from './it.json'
import ja from './ja.json'
import ko_kr from './ko-kr.json'
import ne from './ne.json'
import no from './no.json'
import pl from './pl.json'
import pt_br from './pt-br.json'
import tr from './tr.json'
import zh_cn from './zh-cn.json'

// The default language (english) must have a value for every message.
// Other languages may have missing messages. If the application finds
// a missing message for the current language, it will use the english
// translation instead.

export const TRANSLATIONS: TDTranslations = [
  { code: 'ar', label: 'عربي', messages: ar },
  { code: 'da', label: 'Danish', messages: da },
  { code: 'de', label: 'Deutsch', messages: de },
  { code: 'en', label: 'English', messages: en },
  { code: 'es', label: 'Español', messages: es },
  { code: 'fa', label: 'فارسی', messages: fa },
  { code: 'fr', label: 'Français', messages: fr },
  { code: 'it', label: 'Italiano', messages: it },
  { code: 'ja', label: '日本語', messages: ja },
  { code: 'ko-kr', label: '한국어', messages: ko_kr },
  { code: 'ne', label: 'नेपाली', messages: ne },
  { code: 'no', label: 'Norwegian', messages: no },
  { code: 'pl', label: 'Polski', messages: pl },
  { code: 'pt-br', label: 'Português - Brasil', messages: pt_br },
  { code: 'tr', label: 'Türkçe', messages: tr },
  { code: 'zh-cn', label: 'Chinese - Simplified', messages: zh_cn },
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
