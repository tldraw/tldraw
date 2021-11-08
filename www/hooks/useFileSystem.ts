import * as React from 'react'
import { TLDrawState } from '@tldraw/tldraw'

export function useFileSystem(state: TLDrawState) {
  const promptSaveBeforeChange = React.useCallback(async () => {
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
  }, [state])

  const onNewProject = React.useCallback(async () => {
    await promptSaveBeforeChange()
    state.newProject()
  }, [state, promptSaveBeforeChange])

  const onSaveProject = React.useCallback(() => {
    state.saveProject()
  }, [state])

  const onSaveProjectAs = React.useCallback(() => {
    state.saveProjectAs()
  }, [state])

  const onOpenProject = React.useCallback(async () => {
    await promptSaveBeforeChange()
    state.openProject()
  }, [state, promptSaveBeforeChange])

  return {
    onNewProject,
    onSaveProject,
    onSaveProjectAs,
    onOpenProject,
  }
}
