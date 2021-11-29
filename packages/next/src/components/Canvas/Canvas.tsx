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
import type { TLNuShape } from '~lib/TLNuShape'
import { TLNuBinding, TLNuTargetType } from '~types'

type CanvasProps<S extends TLNuShape = TLNuShape, B extends TLNuBinding = TLNuBinding> = {
  shapes: S[]
  bindings: B[]
  selectedShapes: S[]
  hoveredShape?: S
}

export const Canvas = observer(function Canvas({
  shapes,
  bindings,
  selectedShapes,
  hoveredShape,
}: CanvasProps) {
  const rContainer = React.useRef<HTMLDivElement>(null)
  const rLayer = React.useRef<HTMLDivElement>(null)
  const { viewport, inputs, callbacks } = useContext()

  useResizeObserver(rContainer, viewport)

  useCameraCss(rLayer, rContainer, viewport)

  useGesture(
    {
      onWheel: ({ delta, event: e }) => {
        e.preventDefault()
        if (Vec.isEqual(delta, [0, 0])) return
        viewport.panCamera(delta)
        callbacks.onPan?.({ type: TLNuTargetType.Canvas, order: 0 }, e)
      },
    },
    {
      target: rContainer,
      eventOptions: { passive: false },
      pinch: {
        from: viewport.camera.zoom,
        scaleBounds: () => ({ from: viewport.camera.zoom, max: 5, min: 0.1 }),
      },
    }
  )

  const events = React.useMemo(() => {
    const onPointerMove: React.PointerEventHandler = (e) => {
      inputs.onPointerMove(e)
      callbacks.onPointerMove?.({ type: TLNuTargetType.Canvas, order: e.detail }, e)
    }

    const onPointerDown: React.PointerEventHandler = (e) => {
      inputs.onPointerDown(e)
      callbacks.onPointerDown?.({ type: TLNuTargetType.Canvas, order: e.detail }, e)
    }

    const onPointerUp: React.PointerEventHandler = (e) => {
      inputs.onPointerUp(e)
      callbacks.onPointerUp?.({ type: TLNuTargetType.Canvas, order: e.detail }, e)
    }

    const onKeyDown: React.KeyboardEventHandler = (e) => {
      inputs.onKeyDown(e)
      callbacks.onKeyDown?.({ type: TLNuTargetType.Canvas, order: e.detail }, e)
    }

    const onKeyUp: React.KeyboardEventHandler = (e) => {
      inputs.onKeyUp(e)
      callbacks.onKeyUp?.({ type: TLNuTargetType.Canvas, order: e.detail }, e)
    }

    const onPointerEnter: React.PointerEventHandler = (e) => {
      callbacks.onPointerEnter?.({ type: TLNuTargetType.Canvas, order: e.detail }, e)
    }

    const onPointerLeave: React.PointerEventHandler = (e) => {
      callbacks.onPointerLeave?.({ type: TLNuTargetType.Canvas, order: e.detail }, e)
    }

    return {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onKeyDown,
      onKeyUp,
      onPointerEnter,
      onPointerLeave,
    }
  }, [inputs])

  return (
    <div ref={rContainer} tabIndex={-1} className="nu-absolute nu-canvas" {...events}>
      <div ref={rLayer} className="nu-absolute nu-layer">
        <BoundsBg />
        {shapes.map((shape, i) => (
          <Shape key={'shape_' + shape.id} shape={shape} zIndex={i} />
        ))}
        {selectedShapes.map((shape) => (
          <Indicator key={'selected_indicator_' + shape.id} shape={shape} />
        ))}
        {hoveredShape && (
          <Indicator key={'hovered_indicator_' + hoveredShape.id} shape={hoveredShape} />
        )}
        <BoundsFg />
      </div>
    </div>
  )
})
