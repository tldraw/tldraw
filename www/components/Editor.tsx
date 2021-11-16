import { Tldraw, TldrawApp, useFileSystem } from '@tldraw/Tldraw'
import * as gtag from '-utils/gtag'
import React from 'react'
import { useAccountHandlers } from '-hooks/useAccountHandlers'

interface EditorProps {
  id?: string
  isUser?: boolean
  isSponsor?: boolean
}

export default function Editor({ id = 'home', isSponsor = false }: EditorProps) {
  // Put the state into the window, for debugging.
  const handleMount = React.useCallback((state: TldrawApp) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.state = state
  }, [])

  // Send events to gtag as actions.
  const handlePersist = React.useCallback((_state: TldrawApp, reason?: string) => {
    gtag.event({
      action: reason,
      category: 'editor',
      label: reason || 'persist',
      value: 0,
    })
  }, [])

  const fileSystemEvents = useFileSystem()

  const { onSignIn, onSignOut } = useAccountHandlers()

  return (
    <div className="Tldraw">
      <Tldraw
        id={id}
        autofocus
        onMount={handleMount}
        onPersist={handlePersist}
        showSponsorLink={!isSponsor}
        {...fileSystemEvents}
        onSignIn={isSponsor ? undefined : onSignIn}
        onSignOut={onSignOut}
      />
    </div>
  )
}
