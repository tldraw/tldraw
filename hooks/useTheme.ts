/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { useCallback } from 'react'
import state, { useSelector } from 'state'
import { Theme } from 'types'

export default function useTheme() {
  const theme: Theme = useSelector((state) =>
    state.data.settings.isDarkMode ? 'dark' : 'light'
  )

  const toggleTheme = useCallback(() => state.send('TOGGLED_THEME'), [])

  return { theme, toggleTheme }
}
