import * as React from 'react'
import { TLDraw, TLDrawState } from '@tldraw/tldraw'

export default function App(): JSX.Element {
  const rTLDrawState = React.useRef<TLDrawState>()

  // When the editor mounts, save the tlstate instance in a ref.
  const handleMount = React.useCallback((tldr: TLDrawState) => {
    rTLDrawState.current = tldr
  }, [])

  return (
    <div className="tldraw">
      <TLDraw id={'electron'} onMount={handleMount} autofocus />
    </div>
  )
}
