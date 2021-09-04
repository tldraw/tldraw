import React from 'react'
import type { Data, Theme } from '~types'
import { useTLDrawContext } from './useTLDrawContext'
import { dark } from '~styles'

const themeSelector = (data: Data): Theme => (data.settings.isDarkMode ? 'dark' : 'light')

export function useTheme() {
  const { tlstate, useSelector } = useTLDrawContext()

  const theme = useSelector(themeSelector)

  React.useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add(dark)
    } else {
      document.body.classList.remove(dark)
    }
  }, [theme])

  return {
    theme,
    toggle: tlstate.toggleDarkMode,
  }
}
