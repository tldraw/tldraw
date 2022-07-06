import ar from './ar.json'
import da from './da.json'
import de from './de.json'
import en from './en.json'
import es from './es.json'
import fa from './fa.json'
import fr from './fr.json'
import it from './it.json'
import ja from './ja.json'
import ko_kr from './ko-kr.json'
import main from './main.json'
import ne from './ne.json'
import no from './no.json'
import pl from './pl.json'
import pt_br from './pt-br.json'
import ru from './ru.json'
import tr from './tr.json'
import uk from './uk.json'
import zh_cn from './zh-cn.json'

// The default language (english) must have a value for every message.
// Other languages may have missing messages. If the application finds
// a missing message for the current language, it will use the english
// translation instead.

export const TRANSLATIONS: TDTranslations = [
  { locale: 'ar', label: 'عربي', messages: ar },
  { locale: 'en', label: 'English', messages: en },
  { locale: 'es', label: 'Español', messages: es },
  { locale: 'fr', label: 'Français', messages: fr },
  { locale: 'fa', label: 'فارسی', messages: fa },
  { locale: 'it', label: 'Italiano', messages: it },
  { locale: 'ja', label: '日本語', messages: ja },
  { locale: 'ko-kr', label: '한국어', messages: ko_kr },
  { locale: 'ne', label: 'नेपाली', messages: ne },
  { locale: 'no', label: 'Norwegian', messages: no },
  { locale: 'pl', label: 'Polski', messages: pl },
  { locale: 'pt-br', label: 'Português - Brasil', messages: pt_br },
  { locale: 'tr', label: 'Türkçe', messages: tr },
  { locale: 'zh-ch', label: 'Chinese - Simplified', messages: zh_cn },
  { locale: 'da', label: 'Danish', messages: da },
  { locale: 'de', label: 'Deutsch', messages: de },
  { locale: 'ru', label: 'Russian', messages: ru },
  { locale: 'uk', label: 'Ukrainian', messages: uk },
]

/* ----------------- (do not change) ---------------- */

TRANSLATIONS.sort((a, b) => (a.locale < b.locale ? -1 : 1))

export type TDTranslation = {
  readonly locale: string
  readonly label: string
  readonly messages: Partial<typeof en>
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
