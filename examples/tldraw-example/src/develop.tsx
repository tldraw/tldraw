/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { TDShapeType, Tldraw, TldrawApp, useFileSystem } from '@tldraw/tldraw'

declare const window: Window & { app: TldrawApp }

export default function Develop() {
  const rTldrawApp = React.useRef<TldrawApp>()

  const fileSystemEvents = useFileSystem()

  const handleMount = React.useCallback((app: TldrawApp) => {
    window.app = app
    rTldrawApp.current = app
    // app.reset()
    // app.createShapes({
    //   id: 'box1',
    //   type: TDShapeType.Rectangle,
    //   point: [200, 200],
    //   size: [200, 200],
    // })
  }, [])

  const handleSignOut = React.useCallback(() => {
    // noop
  }, [])

  const handleSignIn = React.useCallback(() => {
    // noop
  }, [])

  const handlePersist = React.useCallback(() => {
    // noop
  }, [])

  return (
    <div className="tldraw">
      <Tldraw
        id="develop"
        {...fileSystemEvents}
        onMount={handleMount}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onPersist={handlePersist}
        showSponsorLink={false}
      />
    </div>
  )
}
