import { Data } from 'types'
import * as vec from 'utils/vec'
import BaseSession from './base-session'
import commands from 'state/commands'
import { current } from 'immer'
import {
  clampToRotationToSegments,
  getBoundsCenter,
  getCommonBounds,
  getPage,
  getSelectedShapes,
  getRotatedBounds,
  getShapeBounds,
} from 'utils/utils'
import { getShapeUtils } from 'lib/shape-utils'

const PI2 = Math.PI * 2

export default class RotateSession extends BaseSession {
  delta = [0, 0]
  origin: number[]
  snapshot: RotateSnapshot

  constructor(data: Data, point: number[]) {
    super(data)
    this.origin = point
    this.snapshot = getRotateSnapshot(data)
  }

  update(data: Data, point: number[], isLocked: boolean) {
    const { commonBoundsCenter, initialShapes } = this.snapshot

    const page = getPage(data)
    const a1 = vec.angle(commonBoundsCenter, this.origin)
    const a2 = vec.angle(commonBoundsCenter, point)

    let rot = a2 - a1

    if (isLocked) {
      rot = clampToRotationToSegments(rot, 24)
    }

    data.boundsRotation = (PI2 + (this.snapshot.boundsRotation + rot)) % PI2

    for (let { id, center, offset, rotation } of initialShapes) {
      const shape = page.shapes[id]

      const nextRotation = isLocked
        ? clampToRotationToSegments(rotation + rot, 24)
        : rotation + rot

      const nextPoint = vec.sub(
        vec.rotWith(center, commonBoundsCenter, rot),
        offset
      )

      getShapeUtils(shape)
        .rotateTo(shape, (PI2 + nextRotation) % PI2)
        .translateTo(shape, nextPoint)
    }
  }

  cancel(data: Data) {
    const page = getPage(data, this.snapshot.currentPageId)

    for (let { id, point, rotation } of this.snapshot.initialShapes) {
      const shape = page.shapes[id]
      getShapeUtils(shape).rotateTo(shape, rotation).translateTo(shape, point)
    }
  }

  complete(data: Data) {
    if (!this.snapshot.hasUnlockedShapes) return
    commands.rotate(data, this.snapshot, getRotateSnapshot(data))
  }
}

export function getRotateSnapshot(data: Data) {
  const initialShapes = getSelectedShapes(current(data)).filter(
    (shape) => !shape.isLocked
  )

  const hasUnlockedShapes = initialShapes.length > 0

  const shapesBounds = Object.fromEntries(
    initialShapes.map((shape) => [shape.id, getShapeBounds(shape)])
  )

  const bounds = getCommonBounds(...Object.values(shapesBounds))

  const commonBoundsCenter = getBoundsCenter(bounds)

  return {
    hasUnlockedShapes,
    currentPageId: data.currentPageId,
    boundsRotation: data.boundsRotation,
    commonBoundsCenter,
    initialShapes: initialShapes.map((shape) => {
      const bounds = shapesBounds[shape.id]
      const center = getBoundsCenter(bounds)
      const offset = vec.sub(center, shape.point)

      return {
        id: shape.id,
        point: shape.point,
        rotation: shape.rotation,
        offset,
        center,
      }
    }),
  }
}

export type RotateSnapshot = ReturnType<typeof getRotateSnapshot>
