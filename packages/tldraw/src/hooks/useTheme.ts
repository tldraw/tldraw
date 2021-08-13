import type { Theme } from '~types'

export function useTheme() {
  return {
    theme: 'light' as Theme,
    toggle: () => null,
  }
}
