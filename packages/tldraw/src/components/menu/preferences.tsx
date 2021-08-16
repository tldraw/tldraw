export function Preferences() {
  const { theme, setTheme } = useTheme()

  const isDebugMode = useSelector((s) => s.data.settings.isDebugMode)
  const isDarkMode = theme === 'dark'

  return (
    <DropdownMenuSubMenu label="Preferences">
      <DropdownMenuCheckboxItem
        checked={isDarkMode}
        onCheckedChange={() => setTheme(isDarkMode ? 'light' : 'dark')}
      >
        <span>Dark Mode</span>
      </DropdownMenuCheckboxItem>
      <DropdownMenuCheckboxItem checked={isDebugMode} onCheckedChange={toggleDebugMode}>
        <span>Debug Mode</span>
      </DropdownMenuCheckboxItem>
    </DropdownMenuSubMenu>
  )
}
