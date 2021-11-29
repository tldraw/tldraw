import Vec from '@tldraw/vec'
import { useGesture } from '@use-gesture/react'
import { observer } from 'mobx-react-lite'
import * as React from 'react'
import { BoundsBg, BoundsFg } from '~components/Bounds'
import { Indicator } from '~components/Indicator/Indicator'
import { Shape } from '~components/Shape/Shape'
import { useCameraCss } from '~hooks/useCameraCss'
import { useContext } from '~hooks/useContext'
import { useResizeObserver } from '~hooks/useResizeObserver'
import type { TLNuBinding, TLNuPage, TLNuShape } from '~types'

interface CanvasProps<S extends TLNuShape = TLNuShape, B extends TLNuBinding = TLNuBinding> {
  page: TLNuPage<S, B>
}

export const Canvas = observer(function Canvas({ page }: CanvasProps) {
  const rContainer = React.useRef<HTMLDivElement>(null)
  const rLayer = React.useRef<HTMLDivElement>(null)
  const { bounds } = useResizeObserver(rContainer)
  const { callbacks } = useContext()

  useCameraCss(rLayer, rContainer, page)

  useGesture(
    {
      onWheel: ({ delta, event: e }) => {
        e.preventDefault()
        if (Vec.isEqual(delta, [0, 0])) return
        callbacks.onPan?.(delta)
      },
    },
    {
      target: rContainer,
      eventOptions: { passive: false },
      pinch: {
        from: page.camera.zoom,
        scaleBounds: () => ({ from: page.camera.zoom, max: 5, min: 0.1 }),
      },
    }
  )

  const shapesArr = Object.values(page.shapes)
  const indicatedShapes = [...page.selectedShapes, page.hoveredShape].filter(Boolean) as TLNuShape[]

  return (
    <div ref={rContainer} className="nu-absolute nu-canvas">
      <div ref={rLayer} className="nu-absolute nu-layer">
        <BoundsBg />
        {shapesArr.map((shape) => (
          <Shape key={shape.id} shape={shape} />
        ))}
        {indicatedShapes.map((shape) => (
          <Indicator key={shape.id} shape={shape} />
        ))}
        <BoundsFg />
      </div>
    </div>
  )
})
