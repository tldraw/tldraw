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
import type { TLNuViewport } from '~lib'
import type { TLNuShape } from '~lib/TLNuShape'
import type { TLNuBinding } from '~types'
import { BoundsUtils } from '~utils'

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
        callbacks.onPan?.(delta)
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
    }

    const onPointerDown: React.PointerEventHandler = (e) => {
      inputs.onPointerDown(e)
    }

    const onPointerUp: React.PointerEventHandler = (e) => {
      inputs.onPointerUp(e)
    }

    const onKeyPress: React.KeyboardEventHandler = (e) => {
      inputs.onKeyPress(e)
    }

    return { onPointerDown, onPointerMove, onPointerUp, onKeyPress }
  }, [inputs])

  return (
    <div ref={rContainer} className="nu-absolute nu-canvas" {...events}>
      <div ref={rLayer} className="nu-absolute nu-layer">
        <BoundsBg />
        {shapes.map((shape) => (
          <Shape key={'shape_' + shape.id} shape={shape} />
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
