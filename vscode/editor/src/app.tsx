/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { TLDraw, TLDrawApp, TLDrawFile, TLDrawDocument } from '@tldraw/tldraw'
import { vscode } from './utils/vscode'
import { defaultDocument } from './utils/defaultDocument'
import type { MessageFromExtension, MessageFromWebview } from './types'

// Will be placed in global scope by extension
declare let currentFile: TLDrawFile

export default function App(): JSX.Element {
  const rTLDrawApp = React.useRef<TLDrawApp>()
  const rInitialDocument = React.useRef<TLDrawDocument>(
    currentFile ? currentFile.document : defaultDocument
  )

  // When the editor mounts, save the state instance in a ref.
  const handleMount = React.useCallback((state: TLDrawApp) => {
    rTLDrawApp.current = state
  }, [])

  // When the editor's document changes, post the stringified document to the vscode extension.
  const handlePersist = React.useCallback((state: TLDrawApp) => {
    vscode.postMessage({
      type: 'editorUpdated',
      text: JSON.stringify({
        ...currentFile,
        document: state.document,
        assets: {},
      } as TLDrawFile),
    } as MessageFromWebview)
  }, [])

  // When the file changes from VS Code's side, update the editor's document.
  React.useEffect(() => {
    function handleMessage({ data }: MessageEvent<MessageFromExtension>) {
      if (data.type === 'openedFile') {
        try {
          const { document } = JSON.parse(data.text) as TLDrawFile
          const state = rTLDrawApp.current!
          state.updateDocument(document)
        } catch (e) {
          console.warn('Failed to parse file:', data.text)
        }
      }
    }

    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  })

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
