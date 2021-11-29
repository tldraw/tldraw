import Vec from '@tldraw/vec'
import { useGesture } from '@use-gesture/react'
import { autorun } from 'mobx'
import { observer } from 'mobx-react-lite'
import * as React from 'react'
import { BoundsBg, BoundsFg } from '~components/Bounds'
import { Brush } from '~components/Brush'
import { Indicator } from '~components/Indicator/Indicator'
import { Shape } from '~components/Shape/Shape'
import { useCameraCss } from '~hooks/useCameraCss'
import { useContext } from '~hooks/useContext'
import { useResizeObserver } from '~hooks/useResizeObserver'
import type { TLNuShape } from '~lib/TLNuShape'
import { TLNuBinding, TLNuBounds, TLNuTargetType } from '~types'

type CanvasProps<S extends TLNuShape = TLNuShape, B extends TLNuBinding = TLNuBinding> = {
  shapes: S[]
  bindings: B[]
  selectedShapes: S[]
  hoveredShape?: S
  selectedBounds?: TLNuBounds
  brush?: TLNuBounds
}

export const Canvas = observer(function Canvas({
  shapes,
  bindings,
  selectedShapes,
  hoveredShape,
  selectedBounds,
  brush,
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
        inputs.onPointerMove([...viewport.getPagePoint([e.clientX, e.clientY]), 0.5], e as any)
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
      inputs.onPointerMove([...viewport.getPagePoint([e.clientX, e.clientY]), e.pressure ?? 0.5], e)
      callbacks.onPointerMove?.({ type: TLNuTargetType.Canvas, order: e.detail }, e)
    }

    const onPointerDown: React.PointerEventHandler = (e) => {
      inputs.onPointerDown([...viewport.getPagePoint([e.clientX, e.clientY]), e.pressure ?? 0.5], e)
      callbacks.onPointerDown?.({ type: TLNuTargetType.Canvas, order: e.detail }, e)
    }

    const onPointerUp: React.PointerEventHandler = (e) => {
      inputs.onPointerUp([...viewport.getPagePoint([e.clientX, e.clientY]), e.pressure ?? 0.5], e)
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
      <SVGLayer>{selectedBounds && <BoundsBg bounds={selectedBounds} />}</SVGLayer>
      <div ref={rLayer} className="nu-absolute nu-layer">
        {shapes.map((shape, i) => (
          <Shape key={'shape_' + shape.id} shape={shape} zIndex={i} />
        ))}
      </div>
      <SVGLayer>
        {selectedShapes.map((shape) => (
          <Indicator key={'selected_indicator_' + shape.id} shape={shape} />
        ))}
        {hoveredShape && (
          <Indicator key={'hovered_indicator_' + hoveredShape.id} shape={hoveredShape} />
        )}
        {selectedBounds && <BoundsFg bounds={selectedBounds} />}
        {brush && <Brush brush={brush} />}
      </SVGLayer>
    </div>
  )
})

interface SVGLayerProps {
  children: React.ReactNode
}

const SVGLayer = observer(function SVGLayer({ children }: SVGLayerProps) {
  const rGroup = React.useRef<SVGGElement>(null)

  const { viewport } = useContext()

  React.useEffect(
    () =>
      autorun(() => {
        const group = rGroup.current
        if (!group) return

        const { zoom, point } = viewport.camera
        group.style.setProperty(
          'transform',
          `scale(${zoom}) translateX(${point[0]}px) translateY(${point[1]}px)`
        )
      }),
    []
  )

  return (
    <svg className="nu-absolute nu-overlay">
      <g ref={rGroup}>{children}</g>
    </svg>
  )
})
