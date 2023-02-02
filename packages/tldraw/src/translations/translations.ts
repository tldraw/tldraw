import ar from './ar.json'
import da from './da.json'
import de from './de.json'
import en from './en.json'
import es from './es.json'
import fa from './fa.json'
import fr from './fr.json'
import gl from './gl.json'
import he from './he.json'
import it from './it.json'
import ja from './ja.json'
import ko_kr from './ko-kr.json'
import ku from './ku.json'
import main from './main.json'
import my from "./my.json"
import nb_no from './nb-no.json'
import ne from './ne.json'
import nn_no from './nn-no.json'
import pl from './pl.json'
import pt_br from './pt-br.json'
import pt_pt from './pt-pt.json'
import ru from './ru.json'
import sv from './sv.json'
import te from './te.json'
import th from './th.json'
import tr from './tr.json'
import uk from './uk.json'
import zh_cn from './zh-cn.json'
import zh_tw from './zh-tw.json'

// The default language (english) must have a value for every message.
// Other languages may have missing messages. If the application finds
// a missing message for the current language, it will use the english
// translation instead.

export const TRANSLATIONS: TDTranslations = [
  { locale: 'ar', label: 'عربي', messages: ar },
  { locale: 'da', label: 'Danish', messages: da },
  { locale: 'de', label: 'Deutsch', messages: de },
  { locale: 'en', label: 'English', messages: en },
  { locale: 'es', label: 'Español', messages: es },
  { locale: 'fa', label: 'فارسی', messages: fa },
  { locale: 'fr', label: 'Français', messages: fr },
  { locale: 'gl', label: 'Galego', messages: gl },
  { locale: 'he', label: 'עברית', messages: he },
  { locale: 'it', label: 'Italiano', messages: it },
  { locale: 'ja', label: '日本語', messages: ja },
  { locale: 'ko-kr', label: '한국어', messages: ko_kr },
  { locale: 'my', label: 'မြန်မာစာ', messages: my},
  { locale: 'nb-no', label: 'Norwegian Bokmål', messages: nb_no },
  { locale: 'ne', label: 'नेपाली', messages: ne },
  { locale: 'nn-no', label: 'Norwegian Nynorsk', messages: nn_no },
  { locale: 'pl', label: 'Polski', messages: pl },
  { locale: 'pt', label: 'Português - Europeu', messages: pt_pt },
  { locale: 'pt-br', label: 'Português - Brasil', messages: pt_br },
  { locale: 'ru', label: 'Russian', messages: ru },
  { locale: 'sv', label: 'Svenska', messages: sv },
  { locale: 'te', label: 'తెలుగు', messages: te },
  { locale: 'tr', label: 'Türkçe', messages: tr },
  { locale: 'uk', label: 'Ukrainian', messages: uk },
  { locale: 'zh-ch', label: '简体中文', messages: zh_cn },
  { locale: 'zh-tw', label: '繁體中文 (台灣)', messages: zh_tw },
  { locale: 'th', label: 'ภาษาไทย', messages: th },
  { locale: 'ku', label: 'کوردی', messages: ku },
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
