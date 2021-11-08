import * as React from 'react'
import { TLDraw, TLDrawState, TLDrawSnapshot, TLDrawFile } from '@tldraw/tldraw'
import { vscode } from './utils/vscode'
import { eventsRegex } from './utils/eventsRegex'
import { defaultDocument } from './utils/defaultDocument'
import { UI_EVENT } from './types'
import './styles.css'

// Will be placed in global scope by extension
declare let currentFile: TLDrawFile

export default function App(): JSX.Element {
  const rTLDrawState = React.useRef<TLDrawState>()

  // When the editor mounts, save the state instance in a ref.
  const handleMount = React.useCallback((tldr: TLDrawState) => {
    rTLDrawState.current = tldr
  }, [])

  // When the editor's document changes, post the stringified document to the vscode extension.
  const handlePersist = React.useCallback((tldr: TLDrawState) => {
    vscode.postMessage({ type: UI_EVENT.TLDRAW_UPDATED, text: JSON.stringify(tldr.document) })
  }, [])

  return (
    <div className="tldraw">
      <TLDraw
        id={currentFile.document.id}
        document={currentFile.document ?? defaultDocument}
        onMount={handleMount}
        onPersist={handlePersist}
        autofocus
      />
    </div>
  )
}
