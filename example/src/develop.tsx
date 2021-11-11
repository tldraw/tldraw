/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { TLDraw, TLDrawState, useFileSystem } from '@tldraw/tldraw'

declare const window: Window & { state: TLDrawState }

export default function Develop(): JSX.Element {
  const rTLDrawState = React.useRef<TLDrawState>()

  const fileSystemEvents = useFileSystem()

  const handleMount = React.useCallback((state: TLDrawState) => {
    window.state = state
    rTLDrawState.current = state
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
        showSponsorLink={false}
      />
    </div>
  )
}
