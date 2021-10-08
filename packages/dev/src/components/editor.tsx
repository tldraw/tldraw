import * as React from 'react'
import { TLDraw, TLDrawProps, TLDrawState } from '@tldraw/tldraw'

export default function Editor(props: TLDrawProps): JSX.Element {
  const rTLDrawState = React.useRef<TLDrawState>()

  const handleMount = React.useCallback((state: TLDrawState) => {
    rTLDrawState.current = state
    props.onMount?.(state)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.tlstate = state
  }, [])

  return (
    <div className="tldraw">
      <TLDraw id="tldraw" {...props} onMount={handleMount} autofocus />
    </div>
  )
}
