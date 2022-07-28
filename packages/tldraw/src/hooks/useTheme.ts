import type { TDSettings, TDSnapshot, Theme } from '~types'
import { useTldrawApp } from './useTldrawApp'

const themeSelector = (data: TDSettings): Theme => (data.isDarkMode ? 'dark' : 'light')

export function useTheme() {
  const app = useTldrawApp()
  const theme = app.useSettingStore(themeSelector)

  return {
    theme,
    toggle: app.toggleDarkMode,
  }
}
