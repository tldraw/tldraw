import * as React from 'react'
import { useTLDrawContext } from '~hooks'

export function useFileSystemHandlers() {
  const { tlstate, callbacks } = useTLDrawContext()

  const onNewProject = React.useCallback(
    async (e?: KeyboardEvent) => {
      if (e && callbacks.onOpenProject) e.preventDefault()
      callbacks.onNewProject?.(tlstate)
    },
    [callbacks]
  )

  const onSaveProject = React.useCallback(
    (e?: KeyboardEvent) => {
      if (e && callbacks.onOpenProject) e.preventDefault()
      callbacks.onSaveProject?.(tlstate)
    },
    [callbacks]
  )

  const onSaveProjectAs = React.useCallback(
    (e?: KeyboardEvent) => {
      if (e && callbacks.onOpenProject) e.preventDefault()
      callbacks.onSaveProjectAs?.(tlstate)
    },
    [callbacks]
  )

  const onOpenProject = React.useCallback(
    async (e?: KeyboardEvent) => {
      if (e && callbacks.onOpenProject) e.preventDefault()
      callbacks.onOpenProject?.(tlstate)
    },
    [callbacks]
  )

  return {
    onNewProject,
    onSaveProject,
    onSaveProjectAs,
    onOpenProject,
  }
}
