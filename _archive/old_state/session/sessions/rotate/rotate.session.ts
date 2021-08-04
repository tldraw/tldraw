import { BaseSession } from '../session-types'
import { Data } from '../../../../types'
import * as commands from '../../../command'
import { TLD } from '../../../tld'
import { Utils, Vec } from '@tldraw/core'

const PI2 = Math.PI * 2

export class RotateSession implements BaseSession {
  delta = [0, 0]
  origin: number[]
  snapshot: RotateSnapshot
  prev = 0

  constructor(data: Data, point: number[]) {
    this.origin = point
    this.snapshot = getRotateSnapshot(data)
  }

  update(data: Data, point: number[], isLocked = false): void {
    const { commonBoundsCenter, initialShapes } = this.snapshot

    const { page, pageState } = data

    const a1 = Vec.angle(commonBoundsCenter, this.origin)
    const a2 = Vec.angle(commonBoundsCenter, point)

    let rot = a2 - a1

    this.prev = rot

    if (isLocked) {
      rot = Utils.clampToRotationToSegments(rot, 24)
    }

    pageState.boundsRotation = (PI2 + (this.snapshot.boundsRotation + rot)) % PI2

    for (const {
      id,
      center,
      offset,
      shape: { rotation = 0 },
    } of initialShapes) {
      const shape = page.shapes[id]

      const nextRotation =
        PI2 +
        ((isLocked ? Utils.clampToRotationToSegments(rotation + rot, 24) : rotation + rot) % PI2)

      const nextPoint = Vec.sub(Vec.rotWith(center, commonBoundsCenter, rot), offset)

      page.shapes[shape.id] = TLD.mutate(data, shape, {
        point: nextPoint,
        rotation: nextRotation,
      })
    }

    const ids = initialShapes.map((s) => s.id)
    TLD.updateBindings(data, ids)
    TLD.updateParents(data, ids)
  }

  cancel = (data: Data): void => {
    const { initialShapes } = this.snapshot

    for (const { id, shape } of initialShapes) {
      data.page[id] = { ...shape }
    }

    const ids = initialShapes.map((s) => s.id)
    TLD.updateBindings(data, ids)
    TLD.updateParents(data, ids)
  }

  complete = (data: Data) => {
    if (!this.snapshot.hasUnlockedShapes) return undefined

    return commands.mutate(
      data,
      this.snapshot.initialShapes.map(({ shape }) => shape),
      this.snapshot.initialShapes.map(({ id }) => Utils.deepClone(data.page.shapes[id])),
    )
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getRotateSnapshot(data: Data) {
  const initialShapes = TLD.getSelectedBranchSnapshot(data)

  if (initialShapes.length === 0) {
    throw Error('No selected shapes!')
  }

  const hasUnlockedShapes = initialShapes.length > 0

  const shapesBounds = Object.fromEntries(
    initialShapes.map((shape) => [shape.id, TLD.getBounds(shape)]),
  )

  const rotatedBounds = Object.fromEntries(
    initialShapes.map((shape) => [shape.id, TLD.getRotatedBounds(shape)]),
  )

  const bounds = Utils.getCommonBounds(Object.values(shapesBounds))

  const commonBoundsCenter = Utils.getBoundsCenter(bounds)

  return {
    hasUnlockedShapes,
    boundsRotation: data.pageState.boundsRotation,
    commonBoundsCenter,
    initialShapes: initialShapes
      .filter((shape) => shape.children === undefined)
      .map((shape) => {
        const bounds = TLD.getBounds(shape)
        const center = Utils.getBoundsCenter(bounds)
        const offset = Vec.sub(center, shape.point)

        const rotationOffset = Vec.sub(center, Utils.getBoundsCenter(rotatedBounds[shape.id]))

        return {
          id: shape.id,
          shape: Utils.deepClone(shape),
          offset,
          rotationOffset,
          center,
        }
      }),
  }
}

export type RotateSnapshot = ReturnType<typeof getRotateSnapshot>
