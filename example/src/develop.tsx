/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { Tldraw, TldrawApp, useFileSystem } from '@tldraw/tldraw'

declare const window: Window & { app: TldrawApp }

export default function Develop(): JSX.Element {
  const rTldrawApp = React.useRef<TldrawApp>()

  const fileSystemEvents = useFileSystem()

  const handleMount = React.useCallback((app: TldrawApp) => {
    window.app = app
    rTldrawApp.current = app
  }, [])

  const handleSignOut = React.useCallback(() => {
    // noop
  }, [])

  const handleSignIn = React.useCallback(() => {
    // noop
  }, [])

  const handlePersist = React.useCallback(() => {
    // noop
  }, [])

  return (
    <div className="tldraw">
      <Tldraw
        id="develop"
        {...fileSystemEvents}
        onMount={handleMount}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onPersist={handlePersist}
        showSponsorLink={true}
      />
    </div>
  )
}
