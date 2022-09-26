import * as React from 'react'
import { useDialog, useTldrawApp } from '~hooks'

export function useFileSystemHandlers() {
  const app = useTldrawApp()

  const { openDialog } = useDialog()

  const onNewProject = React.useCallback(
    async (e?: React.MouseEvent | React.KeyboardEvent | KeyboardEvent) => {
      if (e && app.callbacks.onOpenProject) e.preventDefault()
      app.callbacks.onNewProject?.(app, openDialog)
    },
    [app, openDialog]
  )

  const onSaveProject = React.useCallback(
    (e?: React.MouseEvent | React.KeyboardEvent | KeyboardEvent) => {
      if (e && app.callbacks.onOpenProject) e.preventDefault()
      app.callbacks.onSaveProject?.(app)
    },
    [app]
  )

  const onSaveProjectAs = React.useCallback(
    (e?: React.MouseEvent | React.KeyboardEvent | KeyboardEvent) => {
      if (e && app.callbacks.onOpenProject) e.preventDefault()
      app.callbacks.onSaveProjectAs?.(app)
    },
    [app]
  )

  const onOpenProject = React.useCallback(
    async (e?: React.MouseEvent | React.KeyboardEvent | KeyboardEvent) => {
      if (e && app.callbacks.onOpenProject) e.preventDefault()
      app.callbacks.onOpenProject?.(app, openDialog)
    },
    [app, openDialog]
  )

  const onOpenMedia = React.useCallback(
    async (e?: React.MouseEvent | React.KeyboardEvent | KeyboardEvent) => {
      if (e && app.callbacks.onOpenMedia) e.preventDefault()
      app.callbacks.onOpenMedia?.(app)
    },
    [app]
  )

  return {
    onNewProject,
    onSaveProject,
    onSaveProjectAs,
    onOpenProject,
    onOpenMedia,
  }
}
