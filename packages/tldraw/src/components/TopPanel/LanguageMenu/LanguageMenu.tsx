import * as React from 'react'
import { DMCheckboxItem, DMSubMenu } from '~components/Primitives/DropdownMenu'
import { useTldrawApp } from '~hooks'
import { TDLanguage, TDSnapshot } from '~types'

const settingsSelector = (s: TDSnapshot) => s.settings

type ILang = {
  label: string
  code: TDLanguage
}

export function LanguageMenu() {
  const app = useTldrawApp()
  const setting = app.useStore(settingsSelector)

  const languages: ILang[] = [
    { label: 'English', code: 'en' },
    { label: 'Français', code: 'fr' },
    { label: 'Italiano', code: 'it' },
  ]

  const handleChangeLanguage = React.useCallback(
    (code: TDLanguage) => {
      app.setSetting('language', code)
    },
    [app]
  )

  return (
    <DMSubMenu label="Languages">
      {languages.map((language) => (
        <DMCheckboxItem
          checked={setting.language === language.code}
          onCheckedChange={() => handleChangeLanguage(language.code)}
          id={`TD-MenuItem-Language-${language}`}
        >
          {language.label}
        </DMCheckboxItem>
      ))}
    </DMSubMenu>
  )
}
