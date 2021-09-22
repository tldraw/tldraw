import React from 'react'
import type { Data, Theme } from '~types'
import { useTLDrawContext } from './useTLDrawContext'
import { dark } from '~styles'

const themeSelector = (data: Data): Theme => (data.settings.isDarkMode ? 'dark' : 'light')

export function useThemeEffect(ref: React.RefObject<HTMLDivElement>) {
  const { useSelector } = useTLDrawContext()

  const theme = useSelector(themeSelector)

  React.useEffect(() => {
    const elm = ref.current
    if (!elm) return

    if (theme === 'dark') {
      elm.classList.add(dark)
    } else {
      elm.classList.remove(dark)
    }
  }, [theme])
}

export function useTheme() {
  const { tlstate, useSelector } = useTLDrawContext()

  const theme = useSelector(themeSelector)

  return {
    theme,
    toggle: tlstate.toggleDarkMode,
  }
}
