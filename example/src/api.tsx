import * as React from 'react'
import { Tldraw, TldrawApp, TDShapeType, ColorStyle } from '@tldraw/tldraw'

declare const window: Window & { app: TldrawApp }

export default function Api(): JSX.Element {
  const rTldrawApp = React.useRef<TldrawApp>()

  const handleMount = React.useCallback((app: TldrawApp) => {
    rTldrawApp.current = app

    window.app = app

    app
      .createShapes({
        id: 'rect1',
        type: TDShapeType.Rectangle,
        point: [100, 100],
        size: [200, 200],
      })
      .selectAll()
      .nudge([1, 1], true)
      .duplicate()
      .select('rect1')
      .style({ color: ColorStyle.Blue })
      .selectNone()
  }, [])

  return (
    <div className="tldraw">
      <Tldraw onMount={handleMount} />
    </div>
  )
}
