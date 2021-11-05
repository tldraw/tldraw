import * as React from 'react'
import { TLDraw, TLDrawProps, TLDrawState, useFileSystem } from '@tldraw/tldraw'

export default function Editor(props: TLDrawProps): JSX.Element {
  const rTLDrawState = React.useRef<TLDrawState>()

  const fileSystemEvents = useFileSystem()

  const handleMount = React.useCallback((state: TLDrawState) => {
    rTLDrawState.current = state
    props.onMount?.(state)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.tlstate = state
  }, [])

  const onSignIn = React.useCallback((state: TLDrawState) => {
    // Sign in?
  }, [])

  const onSignOut = React.useCallback((state: TLDrawState) => {
    // Sign out?
  }, [])

  return (
    <div className="tldraw">
      <TLDraw
        id="tldraw1"
        {...props}
        onMount={handleMount}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
        {...fileSystemEvents}
        autofocus
      />
    </div>
  )
}
