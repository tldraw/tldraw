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
import ru from './ru.json'
import uk from './uk.json'
import tr from './tr.json'
import zh_cn from './zh-cn.json'

// The default language (english) must have a value for every message.
// Other languages may have missing messages. If the application finds
// a missing message for the current language, it will use the english
// translation instead.

export const TRANSLATIONS: TDTranslations = [
  { code: 'ar', locale: 'ar', label: 'عربي', messages: ar },
  { code: 'en', locale: 'en', label: 'English', messages: en },
  { code: 'es', locale: 'es', label: 'Español', messages: es },
  { code: 'fr', locale: 'fr', label: 'Français', messages: fr },
  { code: 'fa', locale:'fa', label: 'فارسی', messages: fa },
  { code: 'it', locale: 'it', label: 'Italiano', messages: it },
  { code: 'ja', locale: 'ja', label: '日本語', messages: ja },
  { code: 'ko-kr', locale: 'ko-kr', label: '한국어', messages: ko_kr },
  { code: 'ne', locale: 'ne', label: 'नेपाली', messages: ne },
  { code: 'no', locale: 'no', label: 'Norwegian', messages: no },
  { code: 'pl', locale: 'pl', label: 'Polski', messages: pl },
  { code: 'pt-br', locale: 'pt-br', label: 'Português - Brasil', messages: pt_br },
  { code: 'tr', locale: 'tr', label: 'Türkçe', messages: tr },
  { code: 'zh-cn', locale: 'zh-ch', label: 'Chinese - Simplified', messages: zh_cn },
  { code: 'da', locale: 'da', label: 'Danish', messages: da },
  { code: 'de', locale: 'de', label: 'Deutsch', messages: de},
  { code: 'ru', locale: 'ru', label: 'Russian', messages: ru },
  { code: 'uk', locale: 'uk', label: 'Ukrainian', messages: uk },
]

/* ----------------- (do not change) ---------------- */

TRANSLATIONS.sort((a, b) => (a.code < b.code ? -1 : 1))

export type TDTranslation = {
  readonly code: string
  readonly label: string
  readonly locale: string
  readonly messages: Partial<typeof en>
}

export type TDTranslations = TDTranslation[]

export type TDLanguage = TDTranslations[number]['code']

export function getTranslation(code: TDLanguage): TDTranslation {
  const translation = TRANSLATIONS.find((t) => t.code === code)

  const defaultTranslation = TRANSLATIONS.find((t) => t.code === 'en')!

  const messages = {
    ...defaultTranslation.messages,
    ...translation?.messages,
  }

  return { code, messages, locale: code, label: translation?.label ?? code }
}
