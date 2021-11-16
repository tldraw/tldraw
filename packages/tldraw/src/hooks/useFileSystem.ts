import * as React from 'react'
import type { TldrawApp } from '~state'

export function useFileSystem() {
  const promptSaveBeforeChange = React.useCallback(async (state: TldrawApp) => {
    if (state.isDirty) {
      if (state.fileSystemHandle) {
        if (window.confirm('Do you want to save changes to your current project?')) {
          await state.saveProject()
        }
      } else {
        if (window.confirm('Do you want to save your current project?')) {
          await state.saveProject()
        }
      }
    }
  }, [])

  const onNewProject = React.useCallback(
    async (state: TldrawApp) => {
      await promptSaveBeforeChange(state)
      state.newProject()
    },
    [promptSaveBeforeChange]
  )

  const onSaveProject = React.useCallback((state: TldrawApp) => {
    state.saveProject()
  }, [])

  const onSaveProjectAs = React.useCallback((state: TldrawApp) => {
    state.saveProjectAs()
  }, [])

  const onOpenProject = React.useCallback(
    async (state: TldrawApp) => {
      await promptSaveBeforeChange(state)
      state.openProject()
    },
    [promptSaveBeforeChange]
  )

  return {
    onNewProject,
    onSaveProject,
    onSaveProjectAs,
    onOpenProject,
  }
}
