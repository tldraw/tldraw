import * as React from 'react'
import {
  DropdownMenuDivider,
  DropdownMenuSubMenu,
  DropdownMenuCheckboxItem,
  Kbd,
} from '~components/shared'
import { useTLDrawContext } from '~hooks'
import type { Data } from '~types'

const settingsSelector = (s: Data) => s.settings

export function Preferences() {
  const { tlstate, useSelector } = useTLDrawContext()

  const settings = useSelector(settingsSelector)

  const toggleDebugMode = React.useCallback(() => {
    tlstate.setSetting('isDebugMode', (v) => !v)
  }, [tlstate])

  const toggleDarkMode = React.useCallback(() => {
    tlstate.setSetting('isDarkMode', (v) => !v)
  }, [tlstate])

  const toggleFocusMode = React.useCallback(() => {
    tlstate.setSetting('isFocusMode', (v) => !v)
  }, [tlstate])

  const toggleRotateHandle = React.useCallback(() => {
    tlstate.setSetting('showRotateHandles', (v) => !v)
  }, [tlstate])

  const toggleBoundShapesHandle = React.useCallback(() => {
    tlstate.setSetting('showBindingHandles', (v) => !v)
  }, [tlstate])

  const toggleisSnapping = React.useCallback(() => {
    tlstate.setSetting('isSnapping', (v) => !v)
  }, [tlstate])

  const toggleCloneControls = React.useCallback(() => {
    tlstate.setSetting('showCloneHandles', (v) => !v)
  }, [tlstate])

  return (
    <DropdownMenuSubMenu label="Preferences">
      <DropdownMenuCheckboxItem checked={settings.isDarkMode} onCheckedChange={toggleDarkMode}>
        <span>Dark Mode</span>
        <Kbd variant="menu">#⇧D</Kbd>
      </DropdownMenuCheckboxItem>
      <DropdownMenuCheckboxItem checked={settings.isFocusMode} onCheckedChange={toggleFocusMode}>
        <span>Focus Mode</span>
        <Kbd variant="menu">⇧.</Kbd>
      </DropdownMenuCheckboxItem>
      <DropdownMenuCheckboxItem checked={settings.isDebugMode} onCheckedChange={toggleDebugMode}>
        <span>Debug Mode</span>
      </DropdownMenuCheckboxItem>
      <DropdownMenuDivider />
      <DropdownMenuCheckboxItem
        checked={settings.showRotateHandles}
        onCheckedChange={toggleRotateHandle}
      >
        <span>Rotate Handles</span>
      </DropdownMenuCheckboxItem>
      <DropdownMenuCheckboxItem
        checked={settings.showBindingHandles}
        onCheckedChange={toggleBoundShapesHandle}
      >
        <span>Binding Handles</span>
      </DropdownMenuCheckboxItem>
      <DropdownMenuCheckboxItem
        checked={settings.showCloneHandles}
        onCheckedChange={toggleCloneControls}
      >
        <span>Clone Handles</span>
      </DropdownMenuCheckboxItem>
      <DropdownMenuCheckboxItem checked={settings.isSnapping} onCheckedChange={toggleisSnapping}>
        <span>Always Show Snaps</span>
      </DropdownMenuCheckboxItem>
    </DropdownMenuSubMenu>
  )
}
