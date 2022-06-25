import * as React from 'react'
import { useIntl } from 'react-intl'
import { DMCheckboxItem, DMSubMenu } from '~components/Primitives/DropdownMenu'
import { useTldrawApp } from '~hooks'
import { TDLanguage, TRANSLATIONS } from '~translations'
import { TDSnapshot } from '~types'

const settingsSelector = (s: TDSnapshot) => s.settings

export function LanguageMenu() {
  const app = useTldrawApp()
  const setting = app.useStore(settingsSelector)
  const intl = useIntl()

  const handleChangeLanguage = React.useCallback(
    (code: TDLanguage) => {
      app.setSetting('language', code)
    },
    [app]
  )

  return (
    <DMSubMenu label={intl.formatMessage({ id: 'language' })}>
      {TRANSLATIONS.map(({ code, label }) => (
        <DMCheckboxItem
          key={code}
          checked={setting.language === code}
          onCheckedChange={() => handleChangeLanguage(code)}
          id={`TD-MenuItem-Language-${code}`}
        >
          {label}
        </DMCheckboxItem>
      ))}
    </DMSubMenu>
  )
}
