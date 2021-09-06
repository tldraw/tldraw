import * as React from 'react'
import { TLDraw, TLDrawShapeType, TLDrawState } from '@tldraw/tldraw'

export default function Editor(): JSX.Element {
  const rTLDrawState = React.useRef<TLDrawState>()

  const handleMount = React.useCallback((state: TLDrawState) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.tlstate = state

    rTLDrawState.current = state
    state.selectAll()
    state.createShapes({
      id: 'rect1',
      type: TLDrawShapeType.Rectangle,
      point: [100, 100],
      size: [200, 200],
    })
    state.updateShapes({
      id: 'rect1',
      point: [150, 150],
    })
  }, [])

  return <TLDraw id="tldraw" onMount={handleMount} />
}
