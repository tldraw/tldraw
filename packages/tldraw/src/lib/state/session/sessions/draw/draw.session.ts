import { DrawShape } from './../../../../shape/shape-types'
import { Utils, Vec } from '@tldraw/core'
import { Session } from '../../../state-types'
import { Data } from '../../../state-types'

export class DrawSession implements Session {
  id: 'draw'
  origin: number[]
  previous: number[]
  last: number[]
  points: number[][]
  snapshot: DrawSnapshot
  isLocked: boolean
  lockedDirection: 'horizontal' | 'vertical'
  shape: DrawShape

  constructor(data: Data, id: string, point: number[]) {
    this.origin = point
    this.previous = point
    this.last = point

    this.snapshot = getDrawSnapshot(data, id)

    // Add a first point but don't update the shape yet. We'll update
    // when the draw session ends; if the user hasn't added additional
    // points, this single point will be interpreted as a "dot" shape.
    this.points = [[0, 0, 0.5]]
  }

  start = (data: Data) => data

  update = (data: Data, point: number[], pressure: number, isLocked = false) => {
    const { snapshot } = this

    // Drawing while holding shift will "lock" the pen to either the
    // x or y axis, depending on which direction has the greater
    // delta. Pressing shift will also add more points to "return"
    // the pen to the axis.
    if (isLocked) {
      if (!this.isLocked && this.points.length > 1) {
        const bounds = Utils.getBoundsFromPoints(this.points)
        if (bounds.width > 8 || bounds.height > 8) {
          this.isLocked = true
          const returning = [...this.previous]

          const isVertical = bounds.height > 8

          if (isVertical) {
            this.lockedDirection = 'vertical'
            returning[0] = this.origin[0]
          } else {
            this.lockedDirection = 'horizontal'
            returning[1] = this.origin[1]
          }

          this.previous = returning
          this.points.push(Vec.sub(returning, this.origin))
        }
      }
    } else if (this.isLocked) {
      this.isLocked = false
    }

    if (this.isLocked) {
      if (this.lockedDirection === 'vertical') {
        point[0] = this.origin[0]
      } else {
        point[1] = this.origin[1]
      }
    }

    // Low pass the current input point against the previous one
    const nextPrev = Vec.med(this.previous, point)

    this.previous = nextPrev

    // Don't add duplicate points. It's important to test against the
    // adjusted (low-passed) point rather than the input point.

    const newPoint = Vec.round([...Vec.sub(this.previous, this.origin), pressure])

    if (Vec.isEqual(this.last, newPoint)) return data

    this.last = newPoint

    this.points.push(newPoint)

    // We draw a dot when the number of points is 1 or 2, so this guard
    // prevents a "flash" of a dot when a user begins drawing a line.
    if (this.points.length <= 2) return data

    return {
      ...data,
      page: {
        ...data.page,
        shapes: {
          ...data.page.shapes,
          [snapshot.id]: { ...data.page.shapes[snapshot.id], points: [...this.points] },
        },
      },
      pageState: {
        ...data.pageState,
        selectedIds: [snapshot.id],
      },
    }
  }

  cancel = (data: Data) => {
    const { snapshot } = this
    return {
      ...data,
      page: {
        ...data.page,
        shapes: {
          ...data.page.shapes,
          [snapshot.id]: undefined,
        },
      },
      pageState: {
        ...data.pageState,
        selectedIds: [],
      },
    }
  }

  complete = (data: Data) => {
    const { snapshot } = this
    return {
      id: 'created_draw_shape',
      before: {
        page: {
          shapes: {
            [snapshot.id]: undefined,
          },
        },
        pageState: {
          selectedIds: [],
        },
      },
      after: {
        page: {
          shapes: {
            [snapshot.id]: data.page.shapes[snapshot.id],
          },
        },
        pageState: {
          selectedIds: [],
        },
      },
    }
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getDrawSnapshot(data: Data, shapeId: string) {
  const { page } = data
  const { points, point } = Utils.deepClone(page.shapes[shapeId]) as DrawShape

  return {
    id: shapeId,
    point,
    points,
  }
}

export type DrawSnapshot = ReturnType<typeof getDrawSnapshot>
