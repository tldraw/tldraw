import * as React from 'react'
import { MINIMAP_HEIGHT, MINIMAP_WIDTH } from '+constants'
import { useTLContext } from '+hooks'
import type { TLBinding, TLBounds, TLPage, TLPageState, TLShape, TLShapeUtil } from '+types'
import Utils from '+utils'
import Vec from '@tldraw/vec'

export interface MMapProps<T extends TLShape> {
  page: TLPage<T, TLBinding>
  pageState: TLPageState
  width?: number
  height?: number
  left?: string | number
  right?: string | number
  top?: string | number
  bottom?: string | number
}

export function Minimap<T extends TLShape>({
  page,
  pageState,
  width = MINIMAP_WIDTH,
  height = MINIMAP_HEIGHT,
  left,
  right,
  top,
  bottom,
}: MMapProps<T>) {
  const rSvg = React.useRef<SVGSVGElement>(null)

  const { callbacks, shapeUtils, inputs } = useTLContext()

  const { camera } = pageState

  const style = React.useMemo<React.CSSProperties>(
    () => ({
      width,
      height,
      left,
      right,
      top,
      bottom,
      position: 'absolute',
      zIndex: 800,
    }),
    [width, height, left, right, top, bottom]
  )

  const [vpl, vpt] = Vec.sub(Vec.div([0, 0], camera.zoom), camera.point)
  const [vpr, vpb] = Vec.sub(
    Vec.div([inputs.bounds.width, inputs.bounds.height], camera.zoom),
    camera.point
  )

  // Bounding Boxes

  let commonBounds = {
    minX: vpl,
    minY: vpt,
    maxX: vpr,
    maxY: vpb,
    width: Math.abs(vpr - vpl),
    height: Math.abs(vpb - vpt),
  }

  const shapeBounds: Record<string, TLBounds> = {}

  const allShapes = Object.values(page.shapes)

  if (allShapes.length === 0) return null

  allShapes.forEach((shape, i) => {
    const utils = shapeUtils[shape.type as keyof typeof shapeUtils]
    const bounds = utils.getBounds(shape)
    commonBounds = Utils.getExpandedBounds(commonBounds, bounds)
    shapeBounds[shape.id] = bounds
  })

  // Map component size

  const mw = width
  const mh = height

  const l = commonBounds.minX
  const r = commonBounds.maxX
  const t = commonBounds.minY
  const b = commonBounds.maxY
  const w = commonBounds.width
  const h = commonBounds.height

  const iw = w < h ? mw * (w / h) : mw
  const ih = w > h ? mh * (h / w) : mh
  const il = w < h ? (mw - iw) / 2 : 0
  const it = w > h ? (mh - ih) / 2 : 0

  // Viewport Box

  const viewportBox = {
    minX: il + iw * ((vpl - l) / w),
    minY: it + ih * ((vpt - t) / h),
    maxX: il + iw * ((vpr - r) / w),
    maxY: it + ih * ((vpb - b) / h),
    width: iw * ((vpr - vpl) / w),
    height: ih * ((vpb - vpt) / h),
  }

  // Minimap Shapes

  const minimapShapes: { shape: T; bounds: TLBounds }[] = []

  allShapes.forEach((shape) => {
    const bounds = shapeBounds[shape.id]

    minimapShapes.push({
      shape,
      bounds: {
        minX: il + iw * ((bounds.minX - l) / w),
        minY: it + ih * ((bounds.minY - t) / h),
        maxX: il + iw * ((bounds.maxX - r) / w),
        maxY: it + ih * ((bounds.maxY - b) / h),
        width: (iw * bounds.width) / w,
        height: (ih * bounds.height) / h,
      },
    })
  })

  const mbb = {
    minX: il,
    minY: it,
    maxX: il + iw,
    maxY: it + ih,
    width: iw,
    height: ih,
  }

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const elm = rSvg.current
    if (!elm) return
    const bounds = elm.getBoundingClientRect()
    const normalizedPoint = [
      (e.clientX - bounds.x - mbb.minX) / mbb.width,
      (e.clientY - bounds.y - mbb.minY) / mbb.height,
    ]

    const pagePoint = [
      commonBounds.width * normalizedPoint[0],
      commonBounds.height * normalizedPoint[1],
    ]

    callbacks.onPointMinimap?.(pagePoint, e)

    e.stopPropagation()
  }

  return (
    <svg ref={rSvg} className="tl-minimap" onPointerDown={handlePointerDown} style={style}>
      <rect
        className="tl-minimap-bounds"
        x={mbb.minX}
        y={mbb.minY}
        width={mbb.width}
        height={mbb.height}
        fill="transparent"
      />
      {minimapShapes.map(({ shape, bounds }) => {
        const utils = shapeUtils[shape.type] as TLShapeUtil<T, any, any>
        return <utils.MiniShape key={'mm_' + shape.id} shape={shape} bounds={bounds} />
      })}
      <rect
        className="tl-minimap-viewport"
        x={viewportBox.minX}
        y={viewportBox.minY}
        width={viewportBox.width}
        height={viewportBox.height}
        fill="transparent"
        strokeWidth="1"
      />
    </svg>
  )
}
