/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { Tldraw, TldrawApp, useFileSystem } from '@tldraw/Tldraw'

declare const window: Window & { state: TldrawApp }

export default function Develop(): JSX.Element {
  const rTldrawApp = React.useRef<TldrawApp>()

  const fileSystemEvents = useFileSystem()

  const handleMount = React.useCallback((state: TldrawApp) => {
    window.state = state
    rTldrawApp.current = state
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
    <div className="Tldraw">
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
