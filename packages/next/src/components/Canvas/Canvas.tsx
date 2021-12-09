/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { observer } from 'mobx-react-lite'
import { Brush, Container, HTMLLayer, Indicator, Shape } from '~components'
import {
  useCanvasEvents,
  useContext,
  useGestureEvents,
  useResizeObserver,
  useStylesheet,
} from '~hooks'
import type { TLNuShape } from '~nu-lib'
import type { TLNuBinding, TLNuRendererProps } from '~types'
import { EMPTY_ARRAY, EMPTY_OBJECT } from '~constants'
import { autorun } from 'mobx'
import { ContextBarContainer } from '~components/ContextBarContainer'
import { usePreventNavigation } from '~hooks/usePreventNavigation'
import { BoundsDetailContainer } from '~components/BoundsDetailContainer/BoundsDetailContainer'

export const Canvas = observer(function Renderer({
  bindings = EMPTY_ARRAY,
  bindingShape,
  brush,
  children,
  editingShape,
  hoveredShape,
  id,
  selectedBounds,
  selectedShapes = EMPTY_ARRAY,
  shapes = EMPTY_ARRAY,
  showBounds = true,
  showBoundsRotation = false,
  showResizeHandles = true,
  showRotateHandle = true,
  showBoundsDetail = true,
  showContextBar = true,
  theme = EMPTY_OBJECT,
}: Partial<TLNuRendererProps>): JSX.Element {
  const rContainer = React.useRef<HTMLDivElement>(null)
  useStylesheet(theme, id)
  usePreventNavigation(rContainer)

  const { viewport, components, meta } = useContext()

  useResizeObserver(rContainer, viewport)
  useGestureEvents(rContainer)

  // If we zoomed, set the CSS variable for the zoom
  React.useLayoutEffect(() => {
    return autorun(() => {
      const { zoom } = viewport.camera
      const container = rContainer.current
      if (!container) return
      container.style.setProperty('--nu-zoom', zoom.toString())
    })
  }, [])

  const events = useCanvasEvents()

  const { zoom } = viewport.camera

  return (
    <div ref={rContainer} className="nu-container">
      <div tabIndex={-1} className="nu-absolute nu-canvas" {...events}>
        <HTMLLayer>
          {components.BoundsBackground && selectedBounds && showBounds && (
            <Container bounds={selectedBounds} zIndex={2}>
              <components.BoundsBackground
                zoom={zoom}
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
          {selectedBounds && (
            <>
              {components.BoundsForeground && showBounds && (
                <Container bounds={selectedBounds} zIndex={10002}>
                  <components.BoundsForeground
                    zoom={zoom}
                    shapes={selectedShapes}
                    bounds={selectedBounds}
                    showResizeHandles={showResizeHandles}
                    showRotateHandle={showRotateHandle}
                  />
                </Container>
              )}
              {components.BoundsDetail && (
                <BoundsDetailContainer
                  key={'detail' + selectedShapes.map((shape) => shape.id).join('')}
                  bounds={selectedBounds}
                  detail={showBoundsRotation ? 'rotation' : 'size'}
                  hidden={!showBoundsDetail}
                />
              )}
              {components.ContextBar && (
                <ContextBarContainer
                  key={'context' + selectedShapes.map((shape) => shape.id).join('')}
                  bounds={
                    selectedShapes.length === 1 ? selectedShapes[0].rotatedBounds : selectedBounds
                  }
                  shapes={selectedShapes}
                  hidden={!showContextBar}
                />
              )}
            </>
          )}
        </HTMLLayer>
        {children}
      </div>
    </div>
  )
})
