import * as React from 'react'
import { TLDraw, TLDrawState } from '@tldraw/tldraw'
import type { IpcMainEvent, IpcMain, IpcRenderer } from 'electron'
import type { Message, TLApi } from 'src/types'

export default function App(): JSX.Element {
  const rTLDrawState = React.useRef<TLDrawState>()

  // When the editor mounts, save the state instance in a ref.
  const handleMount = React.useCallback((tldr: TLDrawState) => {
    rTLDrawState.current = tldr
  }, [])

  React.useEffect(() => {
    function handleEvent(message: Message) {
      const state = rTLDrawState.current
      if (!state) return

      switch (message.type) {
        case 'resetZoom': {
          state.resetZoom()
          break
        }
        case 'zoomIn': {
          state.zoomIn()
          break
        }
        case 'zoomOut': {
          state.zoomOut()
          break
        }
        case 'zoomToFit': {
          state.zoomToFit()
          break
        }
        case 'zoomToSelection': {
          state.zoomToSelection()
          break
        }
        case 'undo': {
          state.undo()
          break
        }
        case 'redo': {
          state.redo()
          break
        }
        case 'cut': {
          state.cut()
          break
        }
        case 'copy': {
          state.copy()
          break
        }
        case 'paste': {
          state.paste()
          break
        }
        case 'delete': {
          state.delete()
          break
        }
        case 'selectAll': {
          state.selectAll()
          break
        }
        case 'selectNone': {
          state.selectNone()
          break
        }
      }
    }

    const { send, on } = (window as unknown as Window & { TLApi: TLApi })['TLApi']

    on('projectMsg', handleEvent)
  })

  return (
    <div className="tldraw">
      <TLDraw id="electron" onMount={handleMount} autofocus showMenu={false} />
    </div>
  )
}
