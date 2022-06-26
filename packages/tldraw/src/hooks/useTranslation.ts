import * as React from 'react'
import { TRANSLATIONS, DEFAULT_TRANSLATION, TDLanguage } from '../translations/translations'

export function useTranslation(code?: TDLanguage) {
  return React.useMemo(() => {
    const locale = code ?? navigator.language.split(/[-_]/)[0]

    const translation = TRANSLATIONS.find((t) => t.code === locale)

    const messages = {
      ...DEFAULT_TRANSLATION.messages,
      ...translation?.messages,
    }

    return { locale, messages }
  }, [code])
}
