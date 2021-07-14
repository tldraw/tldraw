import { useTheme } from 'next-themes'
import { useEffect } from 'react'
import state from 'state'

export default function useStateTheme(): void {
  const { theme } = useTheme()

  useEffect(() => {
    state.send('CHANGED_DARK_MODE', { isDarkMode: theme === 'dark' })
  }, [theme])
}
