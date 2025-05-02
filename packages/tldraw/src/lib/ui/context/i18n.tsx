import { defaultI18n, TLI18n } from "@tldraw/editor"
import { getLoadedTranslation } from "../hooks/useTranslation/useTranslation"
import { TLUiTranslationKey } from "../hooks/useTranslation/TLUiTranslationKey"

/** @public @react */
export const TldrawI18n = () => {
  const loadedTranslation = getLoadedTranslation()

  if (!loadedTranslation) return defaultI18n()

  return {
    locale: loadedTranslation.locale,
    dir: loadedTranslation.dir,
    translate: (id?: Exclude<string, TLUiTranslationKey> | string) => {
      return loadedTranslation.messages[id as TLUiTranslationKey] ?? id
    },
  } as TLI18n
}
