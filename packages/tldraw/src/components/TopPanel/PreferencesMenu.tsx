import * as React from 'react'
import { DMCheckboxItem, DMDivider, DMSubMenu } from '~components/DropdownMenu'
import { useTLDrawContext } from '~hooks'
import type { Data } from '~types'

const settingsSelector = (s: Data) => s.settings

export function PreferencesMenu() {
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
