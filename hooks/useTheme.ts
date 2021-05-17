import { useCallback } from "react"
import state, { useSelector } from "state"

export default function useTheme() {
  const theme = useSelector((state) =>
    state.data.settings.isDarkMode ? "dark" : "light"
  )

  const toggleTheme = useCallback(() => state.send("TOGGLED_THEME"), [])

  return { theme, toggleTheme }
}
