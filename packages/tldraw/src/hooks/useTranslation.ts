import * as React from 'react'
import { getTranslation, TDLanguage } from '../translations/translations'

export function useTranslation(locale?: TDLanguage) {
  return React.useMemo(() => {
    return getTranslation(locale ?? navigator.language.split(/[-_]/)[0])
  }, [locale])
}
