import * as React from 'react'
import { TLDraw, TLDrawShapeType, TLDrawState } from '@tldraw/tldraw'

export default function Imperative(): JSX.Element {
  const rTLDrawState = React.useRef<TLDrawState>()
  const handleMount = React.useCallback((state: TLDrawState) => {
    rTLDrawState.current = state

    state.createShapes(
      {
        id: 'rect1',
        type: TLDrawShapeType.Rectangle,
        name: 'Rectangle',
        childIndex: 1,
        point: [0, 0],
        size: [100, 100],
      },
      {
        id: 'rect2',
        name: 'Rectangle',
        type: TLDrawShapeType.Rectangle,
        point: [200, 200],
        size: [100, 100],
      }
    )
  }, [])

  return <TLDraw onMount={handleMount} />
}
