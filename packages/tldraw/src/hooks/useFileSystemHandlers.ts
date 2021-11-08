import * as React from 'react'
import { useTLDrawContext } from '~hooks'

export function useFileSystemHandlers() {
  const { state } = useTLDrawContext()

  const onNewProject = React.useCallback(
    async (e?: KeyboardEvent) => {
      if (e && state.callbacks.onOpenProject) e.preventDefault()
      state.callbacks.onNewProject?.(state)
    },
    [state]
  )

  const onSaveProject = React.useCallback(
    (e?: KeyboardEvent) => {
      if (e && state.callbacks.onOpenProject) e.preventDefault()
      state.callbacks.onSaveProject?.(state)
    },
    [state]
  )

  const onSaveProjectAs = React.useCallback(
    (e?: KeyboardEvent) => {
      if (e && state.callbacks.onOpenProject) e.preventDefault()
      state.callbacks.onSaveProjectAs?.(state)
    },
    [state]
  )

  const onOpenProject = React.useCallback(
    async (e?: KeyboardEvent) => {
      if (e && state.callbacks.onOpenProject) e.preventDefault()
      state.callbacks.onOpenProject?.(state)
    },
    [state]
  )

  return {
    onNewProject,
    onSaveProject,
    onSaveProjectAs,
    onOpenProject,
  }
}
