import type { Data, Theme } from '~types'
import { useTLDrawContext } from './useTLDrawContext'

const themeSelector = (data: Data): Theme => (data.settings.isDarkMode ? 'dark' : 'light')

export function useTheme() {
  const { state, useSelector } = useTLDrawContext()
  const theme = useSelector(themeSelector)

  return {
    theme,
    toggle: state.toggleDarkMode,
  }
}
