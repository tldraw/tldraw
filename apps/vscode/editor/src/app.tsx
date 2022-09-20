/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TDDocument, TDFile, Tldraw, TldrawApp } from '@tldraw/tldraw'
import * as React from 'react'
import type { MessageFromExtension, MessageFromWebview } from './types'
import { defaultDocument } from './utils/defaultDocument'
import { vscode } from './utils/vscode'

// Will be placed in global scope by extension
declare let currentFile: TDFile
declare let assetSrc: string

const App = () => {
  const rLoaded = React.useRef(false)
  const rTldrawApp = React.useRef<TldrawApp>()
  const rInitialDocument = React.useRef<TDDocument>(
    currentFile ? currentFile.document : defaultDocument
  )

  // When the editor mounts, save the state instance in a ref.
  const handleMount = React.useCallback((app: TldrawApp) => {
    TldrawApp.assetSrc = assetSrc ?? 'tldraw-assets.json'
    rTldrawApp.current = app
  }, [])

  // When the editor's document changes, post the stringified document to the vscode extension.
  const handlePersist = React.useCallback((app: TldrawApp) => {
    vscode.postMessage({
      type: 'editorUpdated',
      text: JSON.stringify({
        ...currentFile,
        document: app.document,
        assets: {},
      } as TDFile),
    } as MessageFromWebview)
  }, [])

  // When the file changes from VS Code's side, update the editor's document.
  React.useEffect(() => {
    function handleMessage({ data }: MessageEvent<MessageFromExtension>) {
      if (data.type === 'openedFile') {
        try {
          const { document } = JSON.parse(data.text) as TDFile
          const app = rTldrawApp.current!
          if (rLoaded.current) {
            app.updateDocument(document)
          } else {
            app.loadDocument(document)
            rLoaded.current = true
          }
          app.zoomToFit()
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

export default App
