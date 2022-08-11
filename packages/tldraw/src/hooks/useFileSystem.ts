import * as React from 'react'
import type { TldrawApp } from '~state'
import { useDialog } from './useDialog'

export function useFileSystem() {
  const { hasAccepted, onOpen } = useDialog()
  const promptSaveBeforeChange = React.useCallback(async (app: TldrawApp) => {
    if (app.isDirty) {
      if (app.fileSystemHandle) {
        onOpen('Do you want to save changes to your current project?')
        if (hasAccepted) {
          await app.saveProject()
        }
      } else {
        onOpen('Do you want to save your current project?')
        if (hasAccepted) {
          await app.saveProject()
        }
      }
    }
  }, [])

  const onNewProject = React.useCallback(
    async (app: TldrawApp) => {
      onOpen('Do you want to create a new project?')
      if (hasAccepted) {
        await promptSaveBeforeChange(app)
        app.newProject()
      }
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

  const onOpenMedia = React.useCallback(async (app: TldrawApp) => {
    app.openAsset?.()
  }, [])

  return {
    onNewProject,
    onSaveProject,
    onSaveProjectAs,
    onOpenProject,
    onOpenMedia,
  }
}
