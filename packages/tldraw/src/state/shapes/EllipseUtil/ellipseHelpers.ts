import { Utils } from '@tldraw/core'
import Vec from '@tldraw/vec'
import { getStrokeOutlinePoints, getStrokePoints } from 'perfect-freehand'
import { EASINGS } from '~constants'
import type { EllipseShape } from '~types'
import { getShapeStyle } from '../shape-styles'

export function getEllipseStrokePoints(shape: EllipseShape, boundsCenter: number[]) {
  const {
    id,
    radius: [radiusX, radiusY],
    point,
    style,
  } = shape

  const { strokeWidth } = getShapeStyle(style)

  const getRandom = Utils.rng(id)

  const center = Vec.sub(boundsCenter, point)

  const rx = radiusX + getRandom() * strokeWidth * 2
  const ry = radiusY + getRandom() * strokeWidth * 2

  const perimeter = Utils.perimeterOfEllipse(rx, ry)

  const points: number[][] = []

  const start = Math.PI + Math.PI * getRandom()

  const extra = Math.abs(getRandom())

  const count = Math.max(16, perimeter / 10)

  for (let i = 0; i < count; i++) {
    const t = EASINGS.easeInOutSine(i / (count + 1))
    const rads = start * 2 + Math.PI * (2 + extra) * t
    const c = Math.cos(rads)
    const s = Math.sin(rads)
    points.push([rx * c + center[0], ry * s + center[1], t + 0.5 + getRandom() / 2])
  }

  return getStrokePoints(points, {
    size: 1 + strokeWidth * 2,
    thinning: 0.618,
    end: { taper: perimeter / 8 },
    start: { taper: perimeter / 12 },
    streamline: 0,
    simulatePressure: true,
  })
}

export function getEllipsePath(shape: EllipseShape, boundsCenter: number[]) {
  const {
    id,
    radius: [radiusX, radiusY],
    style,
  } = shape

  const { strokeWidth } = getShapeStyle(style)

  const getRandom = Utils.rng(id)

  const rx = radiusX + getRandom() * strokeWidth * 2
  const ry = radiusY + getRandom() * strokeWidth * 2

  const perimeter = Utils.perimeterOfEllipse(rx, ry)

  return Utils.getSvgPathFromStroke(
    getStrokeOutlinePoints(getEllipseStrokePoints(shape, boundsCenter), {
      size: 1 + strokeWidth * 2,
      thinning: 0.618,
      end: { taper: perimeter / 8 },
      start: { taper: perimeter / 12 },
      streamline: 0,
      simulatePressure: true,
    })
  )
}

export function getEllipseIndicatorPathData(shape: EllipseShape, boundsCenter: number[]) {
  return Utils.getSvgPathFromStroke(
    getEllipseStrokePoints(shape, boundsCenter).map((pt) => pt.point.slice(0, 2)),
    false
  )
}
