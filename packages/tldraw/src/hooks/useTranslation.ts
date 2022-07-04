import * as React from 'react'
import { getTranslation, TDLanguage } from '../translations/translations'

export function useTranslation(code?: TDLanguage) {
  return React.useMemo(() => {
    const locale = code ?? navigator.language.split(/[-_]/)[0]

    return getTranslation(locale)
  }, [code])
}
