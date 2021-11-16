import * as React from 'react'
import type { TldrawApp } from '~state'

export function useFileSystem() {
  const promptSaveBeforeChange = React.useCallback(async (app: TldrawApp) => {
    if (app.isDirty) {
      if (app.fileSystemHandle) {
        if (window.confirm('Do you want to save changes to your current project?')) {
          await app.saveProject()
        }
      } else {
        if (window.confirm('Do you want to save your current project?')) {
          await app.saveProject()
        }
      }
    }
  }, [])

  const onNewProject = React.useCallback(
    async (app: TldrawApp) => {
      await promptSaveBeforeChange(app)
      app.newProject()
    },
    [promptSaveBeforeChange]
  )

  const onSaveProject = React.useCallback((app: TldrawApp) => {
    app.saveProject()
  }, [])

  const onSaveProjectAs = React.useCallback((app: TldrawApp) => {
    app.saveProjectAs()
  }, [])

  const onOpenProject = React.useCallback(
    async (app: TldrawApp) => {
      await promptSaveBeforeChange(app)
      app.openProject()
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
