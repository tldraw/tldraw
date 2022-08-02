import { ExternalLinkIcon } from '@radix-ui/react-icons'
import * as React from 'react'
import { FormattedMessage } from 'react-intl'
import { Divider } from '~components/Primitives/Divider'
import { DMCheckboxItem, DMContent, DMItem } from '~components/Primitives/DropdownMenu'
import { SmallIcon } from '~components/Primitives/SmallIcon'
import { useTldrawApp } from '~hooks'
import { TDLanguage, TRANSLATIONS } from '~translations'
import { TDSnapshot } from '~types'

const languageSelector = (s: TDSnapshot) => s.settings.language

export const LanguageMenu = () => {
  const app = useTldrawApp()
  const language = app.useStore(languageSelector)

  const handleChangeLanguage = React.useCallback(
    (locale: TDLanguage) => {
      app.setSetting('language', locale)
    },
    [app]
  )

  return (
    <DMContent variant="menu" overflow={true} id="language-menu" side="left" sideOffset={8}>
      {TRANSLATIONS.map(({ locale, label }) => (
        <DMCheckboxItem
          key={locale}
          checked={language === locale}
          onCheckedChange={() => handleChangeLanguage(locale)}
          id={`TD-MenuItem-Language-${locale}`}
        >
          {label}
        </DMCheckboxItem>
      ))}
      <Divider />
      <a
        href="https://github.com/tldraw/tldraw/blob/main/guides/translation.md"
        target="_blank"
        rel="nofollow"
      >
        <DMItem id="TD-MenuItem-Translation-Link">
          <FormattedMessage id="translation.link" />
          <SmallIcon>
            <ExternalLinkIcon />
          </SmallIcon>
        </DMItem>
      </a>
    </DMContent>
  )
}
