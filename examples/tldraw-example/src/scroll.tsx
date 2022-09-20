/* eslint-disable @typescript-eslint/no-explicit-any */
import { Tldraw, TldrawApp } from '@tldraw/tldraw'
import * as React from 'react'

declare const window: Window & { app: TldrawApp }

export default function Scroll() {
  const rTldrawApp = React.useRef<TldrawApp>()

  const handleMount = React.useCallback((app: TldrawApp) => {
    window.app = app
    rTldrawApp.current = app
  }, [])

  return (
    <div style={{ height: 1600, width: 1600, padding: 200 }}>
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <Tldraw id="develop" onMount={handleMount} />
      </div>
    </div>
  )
}
