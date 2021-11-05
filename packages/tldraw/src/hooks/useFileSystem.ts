import * as React from 'react'
import { useTLDrawContext } from '~hooks'

export function useFileSystem() {
  const { tlstate } = useTLDrawContext()

  const promptSaveBeforeChange = React.useCallback(async () => {
    if (tlstate.isDirty) {
      if (tlstate.fileSystemHandle) {
        if (window.confirm('Do you want to save changes to your current project?')) {
          await tlstate.saveProject()
        }
      } else {
        if (window.confirm('Do you want to save your current project?')) {
          await tlstate.saveProject()
        }
      }
    }
  }, [tlstate])

  const onNewProject = React.useCallback(async () => {
    await promptSaveBeforeChange()
    tlstate.newProject()
  }, [tlstate, promptSaveBeforeChange])

  const onSaveProject = React.useCallback(() => {
    tlstate.saveProject()
  }, [tlstate])

  const onSaveProjectAs = React.useCallback(() => {
    tlstate.saveProjectAs()
  }, [tlstate])

  const onOpenProject = React.useCallback(async () => {
    await promptSaveBeforeChange()
    tlstate.openProject()
  }, [tlstate, promptSaveBeforeChange])

  return {
    onNewProject,
    onSaveProject,
    onSaveProjectAs,
    onOpenProject,
  }
}
