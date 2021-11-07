import * as React from 'react'
import { TLDraw, Data, TLDrawState } from '@tldraw/tldraw'
import { useMessageHandlers } from './hooks/useMessageHandlers'
import type { TLApi } from 'src/types'

export default function App(): JSX.Element {
  const rTLDrawState = React.useRef<TLDrawState>()

  // When the editor mounts, save the tlstate instance in a ref.
  const handleMount = React.useCallback((tldr: TLDrawState) => {
    rTLDrawState.current = tldr
  }, [])

  useMessageHandlers(rTLDrawState)

  const handleChange = React.useCallback((tlstate: TLDrawState, data: Data, reason: string) => {
    const { sendMessage } = (window as unknown as Window & { TLApi: TLApi })['TLApi']
    if (reason.startsWith('command')) {
      sendMessage({ type: 'change', document: tlstate.document })
    }
  }, [])

  return (
    <div className="tldraw">
      <TLDraw
        id="electron"
        onChange={handleChange}
        onMount={handleMount}
        autofocus
        showMenu={false}
      />
    </div>
  )
}
