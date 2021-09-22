import * as React from 'react'
import { DropdownMenuSubMenu, DropdownMenuCheckboxItem, Kbd } from '~components/shared'
import { useTLDrawContext } from '~hooks'
import type { Data } from '~types'

const isDebugModeSelector = (s: Data) => s.settings.isDebugMode
const isDarkModeSelector = (s: Data) => s.settings.isDarkMode

export function Preferences() {
  const { tlstate, useSelector } = useTLDrawContext()

  const isDebugMode = useSelector(isDebugModeSelector)

  const isDarkMode = useSelector(isDarkModeSelector)

  const isFocusMode = useSelector(isDarkModeSelector)

  const toggleDebugMode = React.useCallback(() => {
    tlstate.toggleDebugMode()
  }, [tlstate])

  const toggleDarkMode = React.useCallback(() => {
    tlstate.toggleDarkMode()
  }, [tlstate])

  const toggleFocusMode = React.useCallback(() => {
    tlstate.toggleFocusMode()
  }, [tlstate])

  return (
    <DropdownMenuSubMenu label="Preferences">
      <DropdownMenuCheckboxItem checked={isDarkMode} onCheckedChange={toggleDarkMode}>
        <span>Dark Mode</span>
        <Kbd variant="menu">#⇧D</Kbd>
      </DropdownMenuCheckboxItem>
      <DropdownMenuCheckboxItem checked={isFocusMode} onCheckedChange={toggleFocusMode}>
        <span>Focus Mode</span>
        <Kbd variant="menu">⇧.</Kbd>
      </DropdownMenuCheckboxItem>
      <DropdownMenuCheckboxItem checked={isDebugMode} onCheckedChange={toggleDebugMode}>
        <span>Debug Mode</span>
      </DropdownMenuCheckboxItem>
    </DropdownMenuSubMenu>
  )
}
