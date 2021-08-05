import { Theme } from '../shape'

export function useTheme() {
  return {
    theme: 'light' as Theme,
    toggle: () => null,
  }
}
