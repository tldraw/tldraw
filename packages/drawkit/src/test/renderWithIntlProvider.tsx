import * as React from 'react'
import { IntlProvider } from 'react-intl'
import messages_fr from '~translations/fr.json'
import messages_en from '~translations/main.json'

export const renderWithIntlProvider = (children: React.ReactNode) => {
  const messages = {
    en: messages_en,
    fr: messages_fr,
  }
  const language = navigator.language.split(/[-_]/)[0]
  return (
    // @ts-ignore
    <IntlProvider locale={language} messages={messages[language]}>
      <>{children}</>
    </IntlProvider>
  )
}
