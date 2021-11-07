import * as React from 'react'
import type { TLDrawState } from '@tldraw/tldraw'
import type { Message, TLApi } from 'src/types'

export function useMessageHandlers(rTLDrawState: React.MutableRefObject<TLDrawState | undefined>) {
  React.useEffect(() => {
    function handleEvent(message: Message) {
      const tlstate = rTLDrawState.current
      if (!tlstate) return

      switch (message.type) {
        // File
        case 'newFile': {
          tlstate.newProject()
          break
        }
        case 'openFile': {
          tlstate.loadDocument(message.file.document)
          break
        }
        // Edit
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
        // View
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
      }
    }

    const { onMessage } = (window as unknown as Window & { TLApi: TLApi })['TLApi']

    onMessage(handleEvent)
  }, [rTLDrawState])
}
