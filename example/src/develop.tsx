/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { TLDraw, TLDrawApp, useFileSystem } from '@tldraw/tldraw'

declare const window: Window & { state: TLDrawApp }

export default function Develop(): JSX.Element {
  const rTLDrawApp = React.useRef<TLDrawApp>()

  const fileSystemEvents = useFileSystem()

  const handleMount = React.useCallback((state: TLDrawApp) => {
    window.state = state
    rTLDrawApp.current = state
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
      <TLDraw
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
