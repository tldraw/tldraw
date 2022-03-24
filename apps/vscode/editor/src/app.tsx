/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TDDocument, TDFile, Tldraw, TldrawApp } from '@tldraw/tldraw'
import { FC, useCallback, useEffect, useRef } from 'react'
import { exportToImage } from 'utils/export'
import type { MessageFromExtension, MessageFromWebview } from './types'
import { defaultDocument } from './utils/defaultDocument'
import { vscode } from './utils/vscode'

// Will be placed in global scope by extension
declare let currentFile: TDFile

const App: FC = () => {
  const rLoaded = useRef(false)
  const rTldrawApp = useRef<TldrawApp>()
  const rInitialDocument = useRef<TDDocument>(currentFile ? currentFile.document : defaultDocument)

  // When the editor mounts, save the state instance in a ref.
  const handleMount = useCallback((app: TldrawApp) => {
    rTldrawApp.current = app
  }, [])

  // When the editor's document changes, post the stringified document to the vscode extension.
  const handlePersist = useCallback((app: TldrawApp) => {
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
  useEffect(() => {
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
        onExport={exportToImage}
        autofocus
      />
    </div>
  )
}

export default App
