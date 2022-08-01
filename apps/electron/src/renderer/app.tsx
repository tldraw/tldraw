import { Tldraw, TldrawApp } from '@tldraw/tldraw'
import * as React from 'react'
import type { Message, TldrawBridgeApi } from 'src/types'

declare const window: Window & { TldrawBridgeApi: TldrawBridgeApi }

export default function App() {
  const rTldrawApp = React.useRef<TldrawApp>()

  // When the editor mounts, save the state instance in a ref.
  const handleMount = React.useCallback((tldr: TldrawApp) => {
    rTldrawApp.current = tldr
  }, [])

  React.useEffect(() => {
    function handleEvent(message: Message) {
      const app = rTldrawApp.current
      if (!app) return

      switch (message.type) {
        case 'resetZoom': {
          app.resetZoom()
          break
        }
        case 'zoomIn': {
          app.zoomIn()
          break
        }
        case 'zoomOut': {
          app.zoomOut()
          break
        }
        case 'zoomToFit': {
          app.zoomToFit()
          break
        }
        case 'zoomToSelection': {
          app.zoomToSelection()
          break
        }
        case 'undo': {
          app.undo()
          break
        }
        case 'redo': {
          app.redo()
          break
        }
        case 'cut': {
          app.cut()
          break
        }
        case 'copy': {
          app.copy()
          break
        }
        case 'paste': {
          app.paste()
          break
        }
        case 'delete': {
          app.delete()
          break
        }
        case 'selectAll': {
          app.selectAll()
          break
        }
        case 'selectNone': {
          app.selectNone()
          break
        }
      }
    }

    const { on } = window.TldrawBridgeApi

    on('projectMsg', handleEvent)
  })

  return (
    <div className="tldraw">
      <Tldraw id="electron" onMount={handleMount} autofocus showMenu={false} />
    </div>
  )
}
