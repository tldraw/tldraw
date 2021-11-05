import * as React from 'react'
import { useTLDrawContext } from '~hooks'

export function useFileSystemHandlers() {
  const { tlstate, callbacks } = useTLDrawContext()

  const onNewProject = React.useCallback(
    async (e?: KeyboardEvent) => {
      callbacks.onNewProject?.(tlstate, e)
    },
    [callbacks]
  )

  const onSaveProject = React.useCallback(
    (e?: KeyboardEvent) => {
      console.log('saving project')
      callbacks.onSaveProject?.(tlstate, e)
    },
    [callbacks]
  )

  const onSaveProjectAs = React.useCallback(
    (e?: KeyboardEvent) => {
      callbacks.onSaveProjectAs?.(tlstate, e)
    },
    [callbacks]
  )

  const onOpenProject = React.useCallback(
    async (e?: KeyboardEvent) => {
      callbacks.onOpenProject?.(tlstate, e)
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
