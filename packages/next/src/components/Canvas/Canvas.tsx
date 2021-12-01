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
import { Container, HTMLLayer } from '~components'

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
  children?: React.ReactNode
  showBounds?: boolean
  showRotateHandle?: boolean
  showResizeHandles?: boolean
}

export const Canvas = observer(function Canvas({
  shapes,
  selectedShapes,
  hoveredShape,
  editingShape,
  bindingShape,
  selectedBounds,
  brush,
  children,
  showBounds = true,
  showRotateHandle = true,
  showResizeHandles = true,
}: CanvasProps) {
  const rContainer = React.useRef<HTMLDivElement>(null)
  const { viewport, components, meta } = useContext()
  useResizeObserver(rContainer, viewport)
  useCameraCss(rContainer, viewport)
  useGestureEvents(rContainer)
  const events = useCanvasEvents()

  return (
    <div ref={rContainer} tabIndex={-1} className="nu-absolute nu-canvas" {...events}>
      <HTMLLayer>
        {selectedBounds && showBounds && (
          <Container bounds={selectedBounds} zIndex={2}>
            <components.boundsBackground
              shapes={selectedShapes}
              bounds={selectedBounds}
              showResizeHandles={showResizeHandles}
              showRotateHandle={showRotateHandle}
            />
          </Container>
        )}
        {shapes.map((shape, i) => (
          <Shape
            key={'shape_' + shape.id}
            shape={shape}
            isEditing={editingShape === shape}
            isHovered={hoveredShape === shape}
            isBinding={bindingShape === shape}
            isSelected={selectedShapes.includes(shape)}
            meta={meta}
            zIndex={100 + i}
          />
        ))}
        {selectedShapes.map((shape) => (
          <Indicator
            key={'selected_indicator_' + shape.id}
            shape={shape}
            isEditing={false}
            isHovered={false}
            isBinding={false}
            isSelected={true}
          />
        ))}
        {hoveredShape && (
          <Indicator key={'hovered_indicator_' + hoveredShape.id} shape={hoveredShape} />
        )}
        {brush && <Brush brush={brush} />}
        {selectedBounds && showBounds && (
          <Container bounds={selectedBounds} zIndex={10002}>
            <components.boundsForeground
              shapes={selectedShapes}
              bounds={selectedBounds}
              showResizeHandles={showResizeHandles}
              showRotateHandle={showRotateHandle}
            />
          </Container>
        )}
      </HTMLLayer>
      {children}
    </div>
  )
})
