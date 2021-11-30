import * as React from 'react'
import { observer } from 'mobx-react-lite'
import { Indicator } from '../Indicator'
import { Shape } from '../Shape'
import { Brush } from '../Brush'
import { SVGLayer } from '../SVGLayer'
import {
  useCameraCss,
  useResizeObserver,
  useContext,
  useCanvasEvents,
  useGestureEvents,
} from '~hooks'
import type { TLNuBinding, TLNuBounds, TLNuBoundsComponent } from '~types'
import type { TLNuShape } from '~nu-lib'

type CanvasProps<S extends TLNuShape = TLNuShape, B extends TLNuBinding = TLNuBinding> = {
  shapes: S[]
  bindings: B[]
  selectedShapes: S[]
  hoveredShape?: S
  editingShape?: S
  bindingShape?: S
  selectedBounds?: TLNuBounds
  brush?: TLNuBounds
  BoundsComponent?: TLNuBoundsComponent<S>
}

export const Canvas = observer(function Canvas({
  shapes,
  selectedShapes,
  hoveredShape,
  editingShape,
  bindingShape,
  selectedBounds,
  brush,
}: CanvasProps) {
  const rContainer = React.useRef<HTMLDivElement>(null)
  const rLayer = React.useRef<HTMLDivElement>(null)
  const { viewport, components, meta } = useContext()
  useResizeObserver(rContainer, viewport)
  useCameraCss(rLayer, rContainer, viewport)
  useGestureEvents(rContainer)
  const events = useCanvasEvents()

  return (
    <div ref={rContainer} tabIndex={-1} className="nu-absolute nu-canvas" {...events}>
      <SVGLayer>
        {selectedBounds && (
          <components.boundsBackground shapes={selectedShapes} bounds={selectedBounds} />
        )}
      </SVGLayer>
      <div ref={rLayer} className="nu-absolute nu-layer">
        {shapes.map((shape, i) => (
          <Shape
            key={'shape_' + shape.id}
            shape={shape}
            zIndex={i}
            isEditing={editingShape === shape}
            isHovered={hoveredShape === shape}
            isBinding={bindingShape === shape}
            isSelected={selectedShapes.includes(shape)}
            meta={meta}
          />
        ))}
      </div>
      <SVGLayer>
        {selectedShapes.map((shape) => (
          <Indicator key={'selected_indicator_' + shape.id} shape={shape} />
        ))}
        {hoveredShape && (
          <Indicator key={'hovered_indicator_' + hoveredShape.id} shape={hoveredShape} />
        )}
        {selectedBounds && (
          <components.boundsForeground shapes={selectedShapes} bounds={selectedBounds} />
        )}
        {brush && <Brush brush={brush} />}
      </SVGLayer>
    </div>
  )
})
