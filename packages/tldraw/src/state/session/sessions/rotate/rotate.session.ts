import { Utils, Vec } from '@tldraw/core'
import { Session, TLDrawShape, TLDrawStatus } from '~types'
import type { Data } from '~types'
import { TLDR } from '~state/tldr'

const PI2 = Math.PI * 2

export class RotateSession implements Session {
  id = 'rotate'
  status = TLDrawStatus.Transforming
  delta = [0, 0]
  origin: number[]
  snapshot: RotateSnapshot
  prev = 0

  constructor(data: Data, point: number[]) {
    this.origin = point
    this.snapshot = getRotateSnapshot(data)
  }

  start = () => void null

  update = (data: Data, point: number[], isLocked = false) => {
    const { commonBoundsCenter, initialShapes } = this.snapshot
    const pageId = data.appState.currentPageId
    const pageState = TLDR.getPageState(data, pageId)

    const shapes: Record<string, Partial<TLDrawShape>> = {}

    const a1 = Vec.angle(commonBoundsCenter, this.origin)
    const a2 = Vec.angle(commonBoundsCenter, point)

    let rot = a2 - a1

    this.prev = rot

    if (isLocked) {
      rot = Utils.clampToRotationToSegments(rot, 24)
    }

    pageState.boundsRotation = (PI2 + (this.snapshot.boundsRotation + rot)) % PI2

    initialShapes.forEach(({ id, center, offset, shape: { rotation = 0 } }) => {
      const nextRotation = isLocked
        ? Utils.clampToRotationToSegments(rotation + rot, 24)
        : rotation + rot

      const nextPoint = Vec.sub(Vec.rotWith(center, commonBoundsCenter, rot), offset)

      shapes[id] = {
        point: nextPoint,
        rotation: (PI2 + nextRotation) % PI2,
      }
    })

    return {
      document: {
        pages: {
          [pageId]: {
            shapes,
          },
        },
      },
    }
  }

  cancel = (data: Data) => {
    const { initialShapes } = this.snapshot
    const pageId = data.appState.currentPageId

    const shapes: Record<string, TLDrawShape> = {}

    for (const { id, shape } of initialShapes) {
      shapes[id] = shape
    }

    return {
      document: {
        pages: {
          [pageId]: {
            shapes,
          },
        },
      },
    }
  }

  complete(data: Data) {
    const { hasUnlockedShapes, initialShapes } = this.snapshot
    const pageId = data.appState.currentPageId

    if (!hasUnlockedShapes) return data

    const beforeShapes = {} as Record<string, Partial<TLDrawShape>>
    const afterShapes = {} as Record<string, Partial<TLDrawShape>>

    initialShapes.forEach(({ id, shape: { point, rotation } }) => {
      beforeShapes[id] = { point, rotation }
      const afterShape = TLDR.getShape(data, id, pageId)
      afterShapes[id] = { point: afterShape.point, rotation: afterShape.rotation }
    })

    return {
      id: 'rotate',
      before: {
        document: {
          pages: {
            [pageId]: {
              shapes: beforeShapes,
            },
          },
        },
      },
      after: {
        document: {
          pages: {
            [pageId]: {
              shapes: afterShapes,
            },
          },
        },
      },
    }
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getRotateSnapshot(data: Data) {
  const currentPageId = data.appState.currentPageId
  const pageState = TLDR.getPageState(data, currentPageId)
  const initialShapes = TLDR.getSelectedBranchSnapshot(data, currentPageId)

  if (initialShapes.length === 0) {
    throw Error('No selected shapes!')
  }

  const hasUnlockedShapes = initialShapes.length > 0

  const shapesBounds = Object.fromEntries(
    initialShapes.map((shape) => [shape.id, TLDR.getBounds(shape)])
  )

  const rotatedBounds = Object.fromEntries(
    initialShapes.map((shape) => [shape.id, TLDR.getRotatedBounds(shape)])
  )

  const bounds = Utils.getCommonBounds(Object.values(shapesBounds))

  const commonBoundsCenter = Utils.getBoundsCenter(bounds)

  return {
    hasUnlockedShapes,
    boundsRotation: pageState.boundsRotation || 0,
    commonBoundsCenter,
    initialShapes: initialShapes
      .filter((shape) => !shape.children)
      .map((shape) => {
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
