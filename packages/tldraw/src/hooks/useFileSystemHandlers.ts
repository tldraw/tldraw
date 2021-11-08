import * as React from 'react'
import { useTLDrawContext } from '~hooks'

export function useFileSystemHandlers() {
  const { tlstate } = useTLDrawContext()

  const onNewProject = React.useCallback(
    async (e?: KeyboardEvent) => {
      if (e && tlstate.callbacks.onOpenProject) e.preventDefault()
      tlstate.callbacks.onNewProject?.(tlstate)
    },
    [tlstate]
  )

  const onSaveProject = React.useCallback(
    (e?: KeyboardEvent) => {
      if (e && tlstate.callbacks.onOpenProject) e.preventDefault()
      tlstate.callbacks.onSaveProject?.(tlstate)
    },
    [tlstate]
  )

  const onSaveProjectAs = React.useCallback(
    (e?: KeyboardEvent) => {
      if (e && tlstate.callbacks.onOpenProject) e.preventDefault()
      tlstate.callbacks.onSaveProjectAs?.(tlstate)
    },
    [tlstate]
  )

  const onOpenProject = React.useCallback(
    async (e?: KeyboardEvent) => {
      if (e && tlstate.callbacks.onOpenProject) e.preventDefault()
      tlstate.callbacks.onOpenProject?.(tlstate)
    },
    [tlstate]
  )

  return {
    onNewProject,
    onSaveProject,
    onSaveProjectAs,
    onOpenProject,
  }
}
