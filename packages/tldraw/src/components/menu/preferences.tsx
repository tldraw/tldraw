import * as React from 'react'
import { DropdownMenuSubMenu, DropdownMenuCheckboxItem } from '~components/shared'
import { useTLDrawContext } from '~hooks'
import type { Data } from '~types'

const isDebugModeSelector = (s: Data) => s.settings.isDebugMode
const isDarkModeSelector = (s: Data) => s.settings.isDarkMode
const isZoomSnapSelector = (s: Data) => s.settings.isZoomSnap

export function Preferences() {
  const { tlstate, useSelector } = useTLDrawContext()

  const isDebugMode = useSelector(isDebugModeSelector)

  const isDarkMode = useSelector(isDarkModeSelector)

  const isZoomSnap = useSelector(isZoomSnapSelector)

  const toggleDebugMode = React.useCallback(() => {
    tlstate.toggleDebugMode()
  }, [tlstate])

  const toggleDarkMode = React.useCallback(() => {
    tlstate.toggleDarkMode()
  }, [tlstate])

  const toggleZoomSnap = React.useCallback(() => {
    tlstate.toggleZoomSnap()
  }, [tlstate])

  return (
    <DropdownMenuSubMenu label="Preferences">
      <DropdownMenuCheckboxItem checked={isDarkMode} onCheckedChange={toggleDarkMode}>
        <span>Dark Mode</span>
      </DropdownMenuCheckboxItem>
      <DropdownMenuCheckboxItem checked={isZoomSnap} onCheckedChange={toggleZoomSnap}>
        <span>Zoom Snap</span>
      </DropdownMenuCheckboxItem>
      <DropdownMenuCheckboxItem checked={isDebugMode} onCheckedChange={toggleDebugMode}>
        <span>Debug Mode</span>
      </DropdownMenuCheckboxItem>
    </DropdownMenuSubMenu>
  )
}
