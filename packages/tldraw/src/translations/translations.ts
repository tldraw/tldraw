import * as React from 'react'

import ar from './ar.json'
import en from './en.json'
import fr from './fr.json'
import it from './it.json'
import ko_kr from './ko-kr.json'
import zh_cn from './zh-cn.json'
import no from './no.json'

// The default language (english) must have a value for every message.
// Other languages may have missing messages. If the application finds
// a missing message for the current language, it will use the english
// translation instead.

export const DEFAULT_TRANSLATION = {
  code: 'en',
  label: 'English',
  messages: en,
}

export const TRANSLATIONS: TDTranslations = [
  DEFAULT_TRANSLATION,
  { code: 'ar', label: 'عربي', messages: ar },
  { code: 'fr', label: 'Français', messages: fr },
  { code: 'it', label: 'Italiano', messages: it },
  { code: 'ko-kr', label: '한국어', messages: ko_kr },
  { code: 'zh-cn', label: 'Chinese - Simplified', messages: zh_cn },
  { code: 'no', label: 'Norwegian', messages: no },
]

/* ---------- Derived Types (do not change) --------- */

export type TDTranslation = {
  readonly code: string
  readonly label: string
  readonly messages: Partial<typeof DEFAULT_TRANSLATION['messages']>
}

export type TDTranslations = TDTranslation[]

export type TDLanguage = TDTranslations[number]['code']
