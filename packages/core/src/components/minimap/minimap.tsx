import { useTLContext } from '+hooks'
import type {
  IShapeTreeNode,
  TLBinding,
  TLBounds,
  TLPage,
  TLPageState,
  TLShape,
  TLShapeUtil,
  TLShapeUtils,
} from '+types'
import Vec from '@tldraw/vec'
import * as React from 'react'

interface MinimapProps<T extends TLShape> {
  commonBounds: TLBounds
  mapBounds: TLBounds
  viewport: TLBounds
  shapes: { shape: T; bounds: TLBounds }[]
}

export function Minimap<T extends TLShape, E extends Element, M = any>({
  commonBounds,
  mapBounds,
  viewport,
  shapes,
}: MinimapProps<T>) {
  const { shapeUtils, callbacks } = useTLContext()
  const rSvg = React.useRef<SVGSVGElement>(null)

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const elm = rSvg.current
      if (!elm) return
      const bounds = elm.getBoundingClientRect()
      const normalizedPoint = [
        (e.clientX - bounds.x - mapBounds.minX) / mapBounds.width,
        (e.clientY - bounds.y - mapBounds.minY) / mapBounds.height,
      ]

      const pagePoint = [
        commonBounds.width * normalizedPoint[0],
        commonBounds.height * normalizedPoint[1],
      ]

      callbacks.onPointMinimap?.(pagePoint, e)

      e.stopPropagation()
    },
    [mapBounds, callbacks, commonBounds]
  )

  return (
    <svg ref={rSvg} className="tl-minimap" onPointerDown={handlePointerDown}>
      <rect
        className="tl-minimap-bounds"
        x={mapBounds.minX}
        y={mapBounds.minY}
        width={mapBounds.width}
        height={mapBounds.height}
        fill="transparent"
      />
      {shapes.map(({ shape, bounds }) => {
        const utils = shapeUtils[shape.type] as TLShapeUtil<T, E, M>
        return <utils.MiniShape key={'mm_' + shape.id} shape={shape} bounds={bounds} />
      })}
      <rect
        className="tl-minimap-viewport"
        x={viewport.minX}
        y={viewport.minY}
        width={viewport.width}
        height={viewport.height}
        fill="none"
        strokeWidth="1"
      />
    </svg>
  )
}
