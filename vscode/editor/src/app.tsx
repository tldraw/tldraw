import * as React from 'react'
import { TLDraw, TLDrawState, TLDrawFile, TLDrawDocument } from '@tldraw/tldraw'
import { vscode } from './utils/vscode'
import { defaultDocument } from './utils/defaultDocument'
import { UI_EVENT } from './types'
import './styles.css'
import { sanitizeDocument } from 'utils/sanitizeDocument'

// Will be placed in global scope by extension
declare let currentFile: TLDrawFile

export default function App(): JSX.Element {
  const rTLDrawState = React.useRef<TLDrawState>()
  const rInitialDocument = React.useRef<TLDrawDocument>(
    currentFile ? currentFile.document : defaultDocument
  )

  // When the editor mounts, save the state instance in a ref.
  const handleMount = React.useCallback((state: TLDrawState) => {
    rTLDrawState.current = state
  }, [])

  // When the editor's document changes, post the stringified document to the vscode extension.
  const handlePersist = React.useCallback((state: TLDrawState) => {
    const initialDocument = rInitialDocument.current

    vscode.postMessage({
      type: UI_EVENT.TLDRAW_UPDATED,
      text: JSON.stringify({
        ...currentFile,
        document: sanitizeDocument(initialDocument, state.document),
        assets: {},
      }),
    })
  }, [])

  return (
    <div className="tldraw">
      <TLDraw
        id={rInitialDocument.current.id}
        document={rInitialDocument.current}
        onMount={handleMount}
        onPersist={handlePersist}
        autofocus
      />
    </div>
  )
}
