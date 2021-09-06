import * as React from 'react'
import { TLDraw, TLDrawState } from '@tldraw/tldraw'

export default function Editor(): JSX.Element {
  const rTLDrawState = React.useRef<TLDrawState>()

  const handleMount = React.useCallback((state: TLDrawState) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.tlstate = state
    rTLDrawState.current = state
  }, [])

  return <TLDraw id="tldraw" onMount={handleMount} />
}
