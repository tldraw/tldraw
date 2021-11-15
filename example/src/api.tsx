import * as React from 'react'
import { TLDraw, TLDrawApp, TLDrawShapeType, ColorStyle } from '@tldraw/tldraw'

export default function Api(): JSX.Element {
  const rTLDrawApp = React.useRef<TLDrawApp>()

  const handleMount = React.useCallback((state: TLDrawApp) => {
    rTLDrawApp.current = state

    state
      .createShapes({
        id: 'rect1',
        type: TLDrawShapeType.Rectangle,
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
      <TLDraw onMount={handleMount} />
    </div>
  )
}
