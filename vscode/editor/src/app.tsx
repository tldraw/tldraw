/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { Tldraw, TldrawApp, TldrawFile, TldrawDocument } from '@tldraw/Tldraw'
import { vscode } from './utils/vscode'
import { defaultDocument } from './utils/defaultDocument'
import type { MessageFromExtension, MessageFromWebview } from './types'

// Will be placed in global scope by extension
declare let currentFile: TldrawFile

export default function App(): JSX.Element {
  const rTldrawApp = React.useRef<TldrawApp>()
  const rInitialDocument = React.useRef<TldrawDocument>(
    currentFile ? currentFile.document : defaultDocument
  )

  // When the editor mounts, save the state instance in a ref.
  const handleMount = React.useCallback((state: TldrawApp) => {
    rTldrawApp.current = state
  }, [])

  // When the editor's document changes, post the stringified document to the vscode extension.
  const handlePersist = React.useCallback((state: TldrawApp) => {
    vscode.postMessage({
      type: 'editorUpdated',
      text: JSON.stringify({
        ...currentFile,
        document: state.document,
        assets: {},
      } as TldrawFile),
    } as MessageFromWebview)
  }, [])

  // When the file changes from VS Code's side, update the editor's document.
  React.useEffect(() => {
    function handleMessage({ data }: MessageEvent<MessageFromExtension>) {
      if (data.type === 'openedFile') {
        try {
          const { document } = JSON.parse(data.text) as TldrawFile
          const state = rTldrawApp.current!
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
    <div className="Tldraw">
      <Tldraw
        id={rInitialDocument.current.id}
        document={rInitialDocument.current}
        onMount={handleMount}
        onPersist={handlePersist}
        autofocus
      />
    </div>
  )
}
