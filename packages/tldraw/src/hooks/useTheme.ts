import type { TDSetting, TDSnapshot, Theme } from '~types'
import { useTldrawApp } from './useTldrawApp'

const themeSelector = (data: TDSetting): Theme => (data.isDarkMode ? 'dark' : 'light')

export function useTheme() {
  const app = useTldrawApp()
  const theme = app.useSettingStore(themeSelector)

  return {
    theme,
    toggle: app.toggleDarkMode,
  }
}
