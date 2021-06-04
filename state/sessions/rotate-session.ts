import { Data, ShapeType } from 'types'
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
  updateParents,
  getDocumentBranch,
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

      // const rotationOffset = vec.sub(
      //   getBoundsCenter(getShapeBounds(shape)),
      //   getBoundsCenter(getRotatedBounds(shape))
      // )

      const nextRotation = isLocked
        ? clampToRotationToSegments(rotation + rot, 24)
        : rotation + rot

      const nextPoint = vec.sub(
        vec.rotWith(center, commonBoundsCenter, rot),
        offset
      )

      getShapeUtils(shape)
        .setProperty(shape, 'rotation', (PI2 + nextRotation) % PI2)
        .setProperty(shape, 'point', nextPoint)
    }

    updateParents(
      data,
      initialShapes.map((s) => s.id)
    )
  }

  cancel(data: Data) {
    const { currentPageId, initialShapes } = this.snapshot
    const page = getPage(data, currentPageId)

    for (let { id, point, rotation } of initialShapes) {
      const shape = page.shapes[id]
      getShapeUtils(shape)
        .setProperty(shape, 'rotation', rotation)
        .setProperty(shape, 'point', point)
    }

    updateParents(
      data,
      initialShapes.map((s) => s.id)
    )
  }

  complete(data: Data) {
    if (!this.snapshot.hasUnlockedShapes) return
    commands.rotate(data, this.snapshot, getRotateSnapshot(data))
  }
}

export function getRotateSnapshot(data: Data) {
  const cData = current(data)
  const page = getPage(cData)

  const initialShapes = Array.from(cData.selectedIds.values())
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
