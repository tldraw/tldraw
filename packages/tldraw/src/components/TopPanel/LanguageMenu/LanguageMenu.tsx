import * as React from 'react'
import { useIntl } from 'react-intl'
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
  const intl = useIntl()

  const languages: ILang[] = [
    { label: 'عربي', code: 'ar' },
    { label: 'English', code: 'en' },
    { label: 'Français', code: 'fr' },
    { label: 'Italiano', code: 'it' },
    { label: 'Chinese - Simplified', code: 'zh-cn' },
  ]

  const handleChangeLanguage = React.useCallback(
    (code: TDLanguage) => {
      app.setSetting('language', code)
    },
    [app]
  )

  return (
    <DMSubMenu label={intl.formatMessage({ id: 'language' })}>
      {languages.map((language) => (
        <DMCheckboxItem
          key={language.code}
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
