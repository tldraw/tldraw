import type { TDSnapshot, Theme } from '~types'
import { useTldrawApp } from './useTldrawApp'

const themeSelector = (data: TDSnapshot): Theme => (data.settings.isDarkMode ? 'dark' : 'light')

export function useTheme() {
  const app = useTldrawApp()
  const theme = app.useSelector(themeSelector)

  return {
    theme,
    toggle: app.toggleDarkMode,
  }
}
