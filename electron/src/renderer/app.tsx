import * as React from 'react'
import { TLDraw, TLDrawState } from '@tldraw/tldraw'
import type { IpcMainEvent, IpcMain, IpcRenderer } from 'electron'
import type { Message, TLApi } from 'src/types'

export default function App(): JSX.Element {
  const rTLDrawState = React.useRef<TLDrawState>()

  // When the editor mounts, save the tlstate instance in a ref.
  const handleMount = React.useCallback((tldr: TLDrawState) => {
    rTLDrawState.current = tldr
  }, [])

  React.useEffect(() => {
    function handleEvent(message: Message) {
      const tlstate = rTLDrawState.current
      if (!tlstate) return

      switch (message.type) {
        case 'resetZoom': {
          tlstate.resetZoom()
          break
        }
        case 'zoomIn': {
          tlstate.zoomIn()
          break
        }
        case 'zoomOut': {
          tlstate.zoomOut()
          break
        }
        case 'zoomToFit': {
          tlstate.zoomToFit()
          break
        }
        case 'zoomToSelection': {
          tlstate.zoomToSelection()
          break
        }
        case 'undo': {
          tlstate.undo()
          break
        }
        case 'redo': {
          tlstate.redo()
          break
        }
        case 'cut': {
          tlstate.cut()
          break
        }
        case 'copy': {
          tlstate.copy()
          break
        }
        case 'paste': {
          tlstate.paste()
          break
        }
        case 'delete': {
          tlstate.delete()
          break
        }
        case 'selectAll': {
          tlstate.selectAll()
          break
        }
        case 'selectNone': {
          tlstate.selectNone()
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
