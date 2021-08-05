import { Utils, Vec } from '@tldraw/core'
import { Session } from '../../../state-types'
import { Data } from '../../../state-types'
import { TLDR } from '../../../tldr'

const PI2 = Math.PI * 2

export class RotateSession implements Session {
  id = 'rotate'
  delta = [0, 0]
  origin: number[]
  snapshot: RotateSnapshot
  prev = 0

  constructor(data: Data, point: number[]) {
    this.origin = point
    this.snapshot = getRotateSnapshot(data)
  }

  start = (data: Data) => data

  update = (data: Data, point: number[], isLocked = false): Data => {
    const { commonBoundsCenter, initialShapes } = this.snapshot

    const next = {
      ...data,
      page: {
        ...data.page,
      },
      pageState: {
        ...data.pageState,
      },
    }

    const { page, pageState } = next

    const a1 = Vec.angle(commonBoundsCenter, this.origin)
    const a2 = Vec.angle(commonBoundsCenter, point)

    let rot = a2 - a1

    this.prev = rot

    if (isLocked) {
      rot = Utils.clampToRotationToSegments(rot, 24)
    }

    pageState.boundsRotation = (PI2 + (this.snapshot.boundsRotation + rot)) % PI2

    next.page.shapes = {
      ...next.page.shapes,
      ...Object.fromEntries(
        initialShapes.map(({ id, center, offset, shape: { rotation = 0 } }) => {
          const shape = page.shapes[id]

          const nextRotation = isLocked
            ? Utils.clampToRotationToSegments(rotation + rot, 24)
            : rotation + rot

          const nextPoint = Vec.sub(Vec.rotWith(center, commonBoundsCenter, rot), offset)

          return [
            id,
            {
              ...next.page.shapes[id],
              ...TLDR.mutate(data, shape, {
                point: nextPoint,
                rotation: (PI2 + nextRotation) % PI2,
              }),
            },
          ]
        })
      ),
    }

    return next
  }

  cancel = (data: Data) => {
    const { initialShapes } = this.snapshot

    for (const { id, shape } of initialShapes) {
      data.page.shapes[id] = { ...shape }
    }

    return {
      ...data,
      page: {
        ...data.page,
        shapes: {
          ...data.page.shapes,
          ...Object.fromEntries(initialShapes.map(({ id, shape }) => [id, shape])),
        },
      },
    }
  }

  complete(data: Data) {
    const { hasUnlockedShapes, initialShapes } = this.snapshot

    if (!hasUnlockedShapes) return data

    return {
      id: 'rotate',
      before: {
        page: {
          shapes: Object.fromEntries(
            initialShapes.map(({ shape: { id, point, rotation = undefined } }) => {
              return [id, { point, rotation }]
            })
          ),
        },
      },
      after: {
        page: {
          shapes: Object.fromEntries(
            this.snapshot.initialShapes.map(({ shape }) => {
              const { point, rotation } = data.page.shapes[shape.id]
              return [shape.id, { point, rotation }]
            })
          ),
        },
      },
    }
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getRotateSnapshot(data: Data) {
  const initialShapes = TLDR.getSelectedBranchSnapshot(data)

  if (initialShapes.length === 0) {
    throw Error('No selected shapes!')
  }

  const hasUnlockedShapes = initialShapes.length > 0

  const shapesBounds = Object.fromEntries(
    initialShapes.map(shape => [shape.id, TLDR.getBounds(shape)])
  )

  const rotatedBounds = Object.fromEntries(
    initialShapes.map(shape => [shape.id, TLDR.getRotatedBounds(shape)])
  )

  const bounds = Utils.getCommonBounds(Object.values(shapesBounds))

  const commonBoundsCenter = Utils.getBoundsCenter(bounds)

  return {
    hasUnlockedShapes,
    boundsRotation: data.pageState.boundsRotation || 0,
    commonBoundsCenter,
    initialShapes: initialShapes
      .filter(shape => shape.children === undefined)
      .map(shape => {
        const bounds = TLDR.getBounds(shape)
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
