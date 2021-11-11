import { TLDraw, TLDrawState, useFileSystem } from '@tldraw/tldraw'
import * as gtag from '-utils/gtag'
import React from 'react'
import { useAccountHandlers } from '-hooks/useAccountHandlers'

interface EditorProps {
  id?: string
  isSponsor?: boolean
}

export default function Editor({ id = 'home', isSponsor = false }: EditorProps) {
  // Put the state into the window, for debugging.
  const handleMount = React.useCallback((state: TLDrawState) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.state = state
  }, [])

  // Send events to gtag as actions.
  const handlePersist = React.useCallback((_state: TLDrawState, reason?: string) => {
    gtag.event({
      action: reason,
      category: 'editor',
      label: reason || 'persist',
      value: 0,
    })
  }, [])

  const fileSystemEvents = useFileSystem()

  const accountEvents = useAccountHandlers()

  return (
    <div className="tldraw">
      <TLDraw
        id={id}
        autofocus
        onMount={handleMount}
        onPersist={handlePersist}
        showSponsorLink={!isSponsor}
        {...fileSystemEvents}
        {...accountEvents}
      />
    </div>
  )
}
