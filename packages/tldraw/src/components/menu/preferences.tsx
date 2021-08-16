import * as React from 'react'
import { DropdownMenuSubMenu, DropdownMenuCheckboxItem } from '~components/shared'
import { useTheme, useTLDrawContext } from '~hooks'
import type { Data } from '~types'

const isDebugModeSelector = (s: Data) => s.settings.isDebugMode

export function Preferences() {
  const { theme, toggle } = useTheme()
  const { tlstate, useSelector } = useTLDrawContext()

  const isDebugMode = useSelector(isDebugModeSelector)
  const isDarkMode = theme === 'dark'

  const toggleDebugMode = React.useCallback(() => {
    tlstate.toggleDebugMode()
  }, [tlstate])

  return (
    <DropdownMenuSubMenu label="Preferences">
      <DropdownMenuCheckboxItem checked={isDarkMode} onCheckedChange={toggle}>
        <span>Dark Mode</span>
      </DropdownMenuCheckboxItem>
      <DropdownMenuCheckboxItem checked={isDebugMode} onCheckedChange={toggleDebugMode}>
        <span>Debug Mode</span>
      </DropdownMenuCheckboxItem>
    </DropdownMenuSubMenu>
  )
}
