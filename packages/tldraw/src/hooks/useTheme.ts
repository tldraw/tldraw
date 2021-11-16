import type { TldrawSnapshot, Theme } from '~types'
import { useTldrawApp } from './useTldrawApp'

const themeSelector = (data: TldrawSnapshot): Theme => (data.settings.isDarkMode ? 'dark' : 'light')

export function useTheme() {
  const app = useTldrawApp()
  const theme = app.useStore(themeSelector)

  return {
    theme,
    toggle: app.toggleDarkMode,
  }
}
