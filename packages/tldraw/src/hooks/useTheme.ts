import type { TLDrawSnapshot, Theme } from '~types'
import { useTLDrawContext } from './useTLDrawContext'

const themeSelector = (data: TLDrawSnapshot): Theme => (data.settings.isDarkMode ? 'dark' : 'light')

export function useTheme() {
  const { state, useSelector } = useTLDrawContext()
  const theme = useSelector(themeSelector)

  return {
    theme,
    toggle: state.toggleDarkMode,
  }
}
