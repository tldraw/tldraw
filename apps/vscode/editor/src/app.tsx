/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { Tldraw, TldrawApp, TDFile, TDDocument } from '@tldraw/tldraw'
import { vscode } from './utils/vscode'
import { defaultDocument } from './utils/defaultDocument'
import type { MessageFromExtension, MessageFromWebview } from './types'
import {toSVG, fromSVG} from "./utils/svgEmbedder";

// Will be placed in global scope by extension
declare let svgEmbedded:boolean;
declare let initialFileContent:string;
declare let currentFile: TDFile

function parseFile(fileContent):TDFile{
  try {
    if( svgEmbedded === false ){
      return JSON.parse(fileContent)
    } else {
      return JSON.parse(fromSVG(fileContent))
    }
  } catch (error) {
    // For now we're going to tread badly formed .tldr files as freshly created files.
    // This will happen if say a user creates a new .tldr file using New File or if they
    // have a bad auto-merge that messes up the json of an existing .tldr file
    // We pass null as the initialDocument value if we can't parse as json.
    return null;
  }
}

currentFile = parseFile(initialFileContent);

export default function App(): JSX.Element {
  const rTldrawApp = React.useRef<TldrawApp>()

  const rInitialDocument = React.useRef<TDDocument>(
    currentFile? currentFile.document : defaultDocument
  )

  // When the editor mounts, save the state instance in a ref.
  const handleMount = React.useCallback((state: TldrawApp) => {
    rTldrawApp.current = state
  }, [])

  // When the editor's document changes, post the stringified document to the vscode extension.
  const handlePersist = React.useCallback((state: TldrawApp) => {
    
    let text:string;
    if(svgEmbedded === false){
      text = JSON.stringify({
        ...currentFile,
        document: state.document,
        assets: {},
      })
    } else {
      text = toSVG(state, currentFile);
      console.log(text);
    }
    console.log(text)

    vscode.postMessage({
      type: 'editorUpdated',
      text,
    } as MessageFromWebview)
  }, [])

  // When the file changes from VS Code's side, update the editor's document.
  React.useEffect(() => {
    function handleMessage({ data }: MessageEvent<MessageFromExtension>) {
      if (data.type === 'openedFile') {
        try {
          const { document } = parseFile(data.text);
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
