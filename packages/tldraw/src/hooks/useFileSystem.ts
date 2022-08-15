import * as React from 'react'
import type { TldrawApp } from '~state'
import { DialogState } from './useDialog'

export function useFileSystem() {
  const onNewProject = React.useCallback(
    async (
      app: TldrawApp,
      openDialog: (
        dialogState: DialogState,
        onYes: () => Promise<void>,
        onNo: () => Promise<void>,
        onCancel: () => Promise<void>
      ) => void
    ) => {
      openDialog(
        app.fileSystemHandle ? 'saveFirstTime' : 'saveAgain',
        async () => {
          // user pressed yes
          try {
            await app.saveProject()
            app.newProject()
          } catch (e) {
            // noop
          }
        },
        async () => {
          // user pressed no
          app.newProject()
        },
        async () => {
          // user pressed cancel
        }
      )
    },
    []
  )

  const onOpenProject = React.useCallback(
    async (
      app: TldrawApp,
      openDialog: (
        dialogState: DialogState,
        onYes: () => Promise<void>,
        onNo: () => Promise<void>,
        onCancel: () => Promise<void>
      ) => void
    ) => {
      openDialog(
        app.fileSystemHandle ? 'saveFirstTime' : 'saveAgain',
        async () => {
          // user pressed yes
          try {
            await app.saveProject()
            await app.openProject()
          } catch (e) {
            // noop
          }
        },
        async () => {
          // user pressed no
          app.openProject()
        },
        async () => {
          // user pressed cancel
        }
      )
    },
    []
  )

  const onSaveProject = React.useCallback((app: TldrawApp) => {
    app.saveProject()
  }, [])

  const onSaveProjectAs = React.useCallback((app: TldrawApp) => {
    app.saveProjectAs()
  }, [])

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
