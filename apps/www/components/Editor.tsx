import React from 'react'
import * as gtag from 'utils/gtag'
import { Tldraw, TldrawApp, TldrawProps, useFileSystem } from '@tlslides/tldraw'
import { useAccountHandlers } from 'hooks/useAccountHandlers'
import { exportToImage } from 'utils/export'

declare const window: Window & { app: TldrawApp }

interface EditorProps {
  id?: string
  isUser?: boolean
  isSponsor?: boolean
}

export default function Editor({
  id = 'home',
  isUser = false,
  isSponsor = false,
  ...rest
}: EditorProps & Partial<TldrawProps>) {
  const handleMount = React.useCallback((app: TldrawApp) => {
    window.app = app
  }, [])

  // Send events to gtag as actions.
  const handlePersist = React.useCallback((_app: TldrawApp, reason?: string) => {
    gtag.event({
      action: reason ?? '',
      category: 'editor',
      label: reason ?? 'persist',
      value: 0,
    })
  }, [])

  const fileSystemEvents = useFileSystem()

  const { onSignIn, onSignOut } = useAccountHandlers()

  return (
    <div className="tldraw">
      <Tldraw
        id={id}
        autofocus
        onMount={handleMount}
        onPersist={handlePersist}
        showSponsorLink={!isSponsor}
        onSignIn={isSponsor ? undefined : onSignIn}
        onSignOut={isUser ? onSignOut : undefined}
        onExport={exportToImage}
        {...fileSystemEvents}
        {...rest}
      />
    </div>
  )
}
