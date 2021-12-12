import type { TLBounds } from '@tldraw/core'
import Vec from '@tldraw/vec'
import type { ArrowShape, TDBinding, TDShape, TDSnapshot, TDBindingInfo } from '~types'
import { TLDR } from './TLDR'
import type { TldrawApp } from './TldrawApp'

export function getArrowChange<S extends ArrowShape>(data: TDSnapshot, shape: S) {
  const { start, end } = shape.handles
  const { currentPageId } = data.appState
  const { bindings, shapes } = data.document.pages[currentPageId]

  let startInfo: { binding: TDBinding; target: TDShape; bounds: TLBounds } | undefined

  if (start.bindingId) {
    const binding = bindings[start.bindingId]
    const target = shapes[binding.toId]
    const bounds = TLDR.getBounds(target)
    startInfo = { binding, target, bounds }
  }

  let endInfo: { binding: TDBinding; target: TDShape; bounds: TLBounds } | undefined

  if (end.bindingId) {
    const binding = bindings[end.bindingId]
    const target = shapes[binding.toId]
    const bounds = TLDR.getBounds(target)
    endInfo = { binding, target, bounds }
  }

  const bendHandlePoint = Vec.add(shape.point, shape.handles.bend.point)
  let startHandlePoint = Vec.add(shape.point, shape.handles.start.point)
  let endHandlePoint = Vec.add(shape.point, shape.handles.end.point)

  // The "origins" here are the points in page-space where the arrow's
  // handles are located; or, if they are bound to a shape, the page-
  // space location of they're "anchor" points. We use these points to
  // find intersections.
  const startOrigin = startInfo ? getOrigin(startInfo) : startHandlePoint
  const endOrigin = endInfo ? getOrigin(endInfo) : endHandlePoint

  let isStraightLine = false

  const dist = Vec.dist(startOrigin, endOrigin)
  const bendDist = (dist / 2) * shape.bend
  isStraightLine = Math.abs(bendDist) < 10

  if (!isStraightLine) {
    let start = startHandlePoint
    let end = endHandlePoint
    const [cx, cy, r] = Utils.circleFromThreePoints(startOrigin, bendHandlePoint, endOrigin)
    if (startInfo) {
      const { binding } = startInfo
      const padding = shape.decorations?.start ? binding.distance : 0
      const intersection = findCurveIntersectionPoint(
        [cx, cy],
        r,
        endOrigin,
        bendHandlePoint,
        startOrigin,
        padding,
        startInfo
      )
      if (intersection) start = intersection
    }
    if (endInfo) {
      const { binding } = endInfo
      const padding = shape.decorations?.end ? binding.distance : 0
      const intersection = findCurveIntersectionPoint(
        [cx, cy],
        r,
        startOrigin,
        bendHandlePoint,
        endOrigin,
        padding,
        endInfo
      )
      if (intersection) end = intersection
    }

    if (Vec.dist(Vec.med(start, end), Vec.med(startOrigin, endOrigin)) < 32) {
      isStraightLine = true
    } else {
      startHandlePoint = start
      endHandlePoint = end
    }
  }

  if (isStraightLine) {
    if (startInfo) {
      const { binding } = startInfo
      const padding = shape.decorations?.start ? binding.distance : 0
      const intersection = findIntersectionPoint(endOrigin, startOrigin, padding, startInfo)
      if (intersection) startHandlePoint = intersection
    }

    if (endInfo) {
      const { binding } = endInfo
      const padding = shape.decorations?.end ? binding.distance : 0
      const intersection = findIntersectionPoint(startOrigin, endOrigin, padding, endInfo)
      if (intersection) endHandlePoint = intersection
    }

    // bendHandlePoint = Vec.med(startHandlePoint, endHandlePoint)
  }

  const shapeSpaceStart = Vec.sub(startHandlePoint, shape.point)
  const shapeSpaceEnd = Vec.sub(endHandlePoint, shape.point)

  const nextHandles: Partial<ArrowShape['handles']> = {
    start: {
      ...shape.handles.start,
      point: shapeSpaceStart,
    },
    end: {
      ...shape.handles.end,
      point: shapeSpaceEnd,
    },
  }
}
