import * as React from 'react'
import { DMCheckboxItem, DMDivider, DMSubMenu } from '~components/DropdownMenu'
import { useTLDrawContext } from '~hooks'
import type { Data } from '~types'

const settingsSelector = (s: Data) => s.settings

export function PreferencesMenu() {
  const { state, useSelector } = useTLDrawContext()

  const settings = useSelector(settingsSelector)

  const toggleDebugMode = React.useCallback(() => {
    state.setSetting('isDebugMode', (v) => !v)
  }, [state])

  const toggleDarkMode = React.useCallback(() => {
    state.setSetting('isDarkMode', (v) => !v)
  }, [state])

  const toggleFocusMode = React.useCallback(() => {
    state.setSetting('isFocusMode', (v) => !v)
  }, [state])

  const toggleRotateHandle = React.useCallback(() => {
    state.setSetting('showRotateHandles', (v) => !v)
  }, [state])

  const toggleBoundShapesHandle = React.useCallback(() => {
    state.setSetting('showBindingHandles', (v) => !v)
  }, [state])

  const toggleisSnapping = React.useCallback(() => {
    state.setSetting('isSnapping', (v) => !v)
  }, [state])

  const toggleCloneControls = React.useCallback(() => {
    state.setSetting('showCloneHandles', (v) => !v)
  }, [state])

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
