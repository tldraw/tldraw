import * as React from 'react'
import { DMCheckboxItem, DMDivider, DMSubMenu } from '~components/DropdownMenu'
import { useTldrawApp } from '~hooks'
import type { TldrawSnapshot } from '~types'

const settingsSelector = (s: TldrawSnapshot) => s.settings

export function PreferencesMenu() {
  const app = useTldrawApp()

  const settings = app.useStore(settingsSelector)

  const toggleDebugMode = React.useCallback(() => {
    state.setSetting('isDebugMode', (v) => !v)
  }, [app])

  const toggleDarkMode = React.useCallback(() => {
    state.setSetting('isDarkMode', (v) => !v)
  }, [app])

  const toggleFocusMode = React.useCallback(() => {
    state.setSetting('isFocusMode', (v) => !v)
  }, [app])

  const toggleRotateHandle = React.useCallback(() => {
    state.setSetting('showRotateHandles', (v) => !v)
  }, [app])

  const toggleBoundShapesHandle = React.useCallback(() => {
    state.setSetting('showBindingHandles', (v) => !v)
  }, [app])

  const toggleisSnapping = React.useCallback(() => {
    state.setSetting('isSnapping', (v) => !v)
  }, [app])

  const toggleCloneControls = React.useCallback(() => {
    state.setSetting('showCloneHandles', (v) => !v)
  }, [app])

  return (
    <DMSubMenu label="Preferences">
      <DMCheckboxItem checked={settings.isDarkMode} onCheckedChange={toggleDarkMode} kbd="#⇧D">
        Dark Mode
      </DMCheckboxItem>
      <DMCheckboxItem checked={settings.isFocusMode} onCheckedChange={toggleFocusMode} kbd="⇧.">
        Focus Mode
      </DMCheckboxItem>
      <DMCheckboxItem checked={settings.isDebugMode} onCheckedChange={toggleDebugMode}>
        Debug Mode
      </DMCheckboxItem>
      <DMDivider />
      <DMCheckboxItem checked={settings.showRotateHandles} onCheckedChange={toggleRotateHandle}>
        Rotate Handles
      </DMCheckboxItem>
      <DMCheckboxItem
        checked={settings.showBindingHandles}
        onCheckedChange={toggleBoundShapesHandle}
      >
        Binding Handles
      </DMCheckboxItem>
      <DMCheckboxItem checked={settings.showCloneHandles} onCheckedChange={toggleCloneControls}>
        Clone Handles
      </DMCheckboxItem>
      <DMCheckboxItem checked={settings.isSnapping} onCheckedChange={toggleisSnapping}>
        Always Show Snaps
      </DMCheckboxItem>
    </DMSubMenu>
  )
}
