import { Data, ShapeType } from 'types'
import vec from 'utils/vec'
import BaseSession from './base-session'
import commands from 'state/commands'
import { current } from 'immer'
import {
  clampToRotationToSegments,
  getBoundsCenter,
  getCommonBounds,
  getPage,
  getRotatedBounds,
  getShapeBounds,
  updateParents,
  getDocumentBranch,
  setToArray,
  getSelectedIds,
} from 'utils'
import { getShapeUtils } from 'state/shape-utils'

const PI2 = Math.PI * 2

export default class RotateSession extends BaseSession {
  delta = [0, 0]
  origin: number[]
  snapshot: RotateSnapshot
  prev = 0

  constructor(data: Data, point: number[]) {
    super(data)
    this.origin = point
    this.snapshot = getRotateSnapshot(data)
  }

  update(data: Data, point: number[], isLocked: boolean): void {
    const { commonBoundsCenter, initialShapes } = this.snapshot

    const page = getPage(data)
    const a1 = vec.angle(commonBoundsCenter, this.origin)
    const a2 = vec.angle(commonBoundsCenter, point)

    let rot = a2 - a1

    const delta = rot - this.prev
    this.prev = rot

    if (isLocked) {
      rot = clampToRotationToSegments(rot, 24)
    }

    data.boundsRotation = (PI2 + (this.snapshot.boundsRotation + rot)) % PI2

    for (const { id, center, offset, rotation } of initialShapes) {
      const shape = page.shapes[id]

      const nextRotation =
        PI2 +
        ((isLocked
          ? clampToRotationToSegments(rotation + rot, 24)
          : rotation + rot) %
          PI2)

      const nextPoint = vec.sub(
        vec.rotWith(center, commonBoundsCenter, rot),
        offset
      )

      getShapeUtils(shape)
        .rotateTo(shape, nextRotation, delta)
        .translateTo(shape, nextPoint)
    }

    updateParents(
      data,
      initialShapes.map((s) => s.id)
    )
  }

  cancel(data: Data): void {
    const { initialShapes } = this.snapshot
    const page = getPage(data)

    for (const { id, point, rotation } of initialShapes) {
      const shape = page.shapes[id]
      getShapeUtils(shape)
        .rotateTo(shape, rotation, rotation - shape.rotation)
        .translateTo(shape, point)
    }

    updateParents(
      data,
      initialShapes.map((s) => s.id)
    )
  }

  complete(data: Data): void {
    if (!this.snapshot.hasUnlockedShapes) return
    commands.rotate(data, this.snapshot, getRotateSnapshot(data))
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getRotateSnapshot(data: Data) {
  const cData = current(data)
  const page = getPage(cData)

  const initialShapes = setToArray(getSelectedIds(data))
    .flatMap((id) => getDocumentBranch(cData, id).map((id) => page.shapes[id]))
    .filter((shape) => !shape.isLocked)

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
    initialShapes: initialShapes
      .filter((shape) => shape.type !== ShapeType.Group)
      .map((shape) => {
        const bounds = shapesBounds[shape.id]
        const center = getBoundsCenter(bounds)
        const offset = vec.sub(center, shape.point)

        const rotationOffset = vec.sub(
          center,
          getBoundsCenter(getRotatedBounds(shape))
        )

        return {
          id: shape.id,
          point: shape.point,
          rotation: shape.rotation,
          offset,
          rotationOffset,
          center,
        }
      }),
  }
}

export type RotateSnapshot = ReturnType<typeof getRotateSnapshot>
