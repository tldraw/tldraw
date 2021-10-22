import * as React from 'react'
import { TLDraw, TLDrawState, TLDrawDocument, Data } from '@tldraw/tldraw'
import { vscode } from './utils/vscode'
import { eventsRegex } from './utils/eventsRegex'
import { defaultDocument } from './utils/defaultDocument'
import { UI_EVENT } from './types'
import './styles.css'

// Will be placed in global scope by extension
declare let localDocument: TLDrawDocument

export default function App(): JSX.Element {
  const rTLDrawState = React.useRef<TLDrawState>()

  const rContainer = React.useRef<HTMLDivElement>(null)

  // When the editor mounts, save the tlstate instance in a ref.
  const handleMount = React.useCallback((tldr: TLDrawState) => {
    rTLDrawState.current = tldr
  }, [])

  // When the editor's document changes, post the stringified document to the vscode extension.
  const handleChange = React.useCallback((tldr: TLDrawState, data: Data, type: string) => {
    if (type.search(eventsRegex) === 0) {
      vscode.postMessage({ type: UI_EVENT.TLDRAW_UPDATED, text: JSON.stringify(tldr.document) })
    }
  }, [])

  // If the initial document is an empty string, we initialize it to the default
  // document text content
  const document = localDocument === null ? defaultDocument : localDocument

  return (
    <div className="tldraw" ref={rContainer}>
      <TLDraw
        id={document.id}
        document={document}
        onMount={handleMount}
        onChange={handleChange}
        autofocus
      />
    </div>
  )
}
