import { Utils, Vec } from '@tldraw/core'
import { Data, DrawShape, Session, TLDrawStatus } from '~types'
import { TLDR } from '~state/tldr'

// TODO
// [ ] - Solve flat lines at corners on perfectly straight lines

export class DrawSession implements Session {
  id = 'draw'
  status = TLDrawStatus.Creating
  origin: number[]
  previous: number[]
  last: number[]
  points: number[][]
  snapshot: DrawSnapshot
  isLocked?: boolean
  lockedDirection?: 'horizontal' | 'vertical'
  startTime: number

  constructor(data: Data, id: string, point: number[]) {
    this.origin = point
    this.previous = point
    this.last = point

    this.snapshot = getDrawSnapshot(data, id)

    // Add a first point but don't update the shape yet. We'll update
    // when the draw session ends; if the user hasn't added additional
    // points, this single point will be interpreted as a "dot" shape.
    this.points = []
    this.startTime = 0
  }

  start = () => void null

  update = (data: Data, point: number[], pressure: number, isLocked = false) => {
    const { snapshot } = this

    // Roundabout way of preventing the "dot" from showing while drawing
    if (this.points.length === 0) {
      this.startTime = Date.now()
      this.points.push([0, 0, pressure, 0])
    }

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

    // The previous input (not adjusted) point
    this.previous = point

    // The new adjusted point
    const newPoint = Vec.round(Vec.sub(this.previous, this.origin)).concat(
      pressure,
      Date.now() - this.startTime
    )

    // Don't add duplicate points. Be sure to
    // test against the previous *adjusted* point.
    if (Vec.isEqual(this.last, newPoint)) return

    // The new adjusted point is now the previous adjusted point.
    this.last = newPoint

    // Add the new adjusted point to the points array
    this.points.push(newPoint)

    return {
      document: {
        pages: {
          [data.appState.currentPageId]: {
            shapes: {
              [snapshot.id]: {
                points: [...this.points], // Set to a new array here
              },
            },
          },
        },
        pageStates: {
          [data.appState.currentPageId]: {
            selectedIds: [snapshot.id],
          },
        },
      },
    }
  }

  cancel = (data: Data) => {
    const { snapshot } = this
    const pageId = data.appState.currentPageId

    return {
      document: {
        pages: {
          [pageId]: {
            shapes: {
              [snapshot.id]: undefined,
            },
          },
        },
        pageStates: {
          [pageId]: {
            selectedIds: [],
          },
        },
      },
    }
  }

  complete = (data: Data) => {
    const { snapshot } = this
    const pageId = data.appState.currentPageId

    this.points.push(this.last)

    return {
      id: 'create_draw',
      before: {
        document: {
          pages: {
            [pageId]: {
              shapes: {
                [snapshot.id]: undefined,
              },
            },
          },
          pageStates: {
            [pageId]: {
              selectedIds: [],
            },
          },
        },
      },
      after: {
        document: {
          pages: {
            [pageId]: {
              shapes: {
                [snapshot.id]: TLDR.onSessionComplete(
                  data,
                  { ...TLDR.getShape(data, snapshot.id, pageId), points: [...this.points] },
                  pageId
                ),
              },
            },
          },
          pageStates: {
            [data.appState.currentPageId]: {
              selectedIds: [],
            },
          },
        },
      },
    }
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getDrawSnapshot(data: Data, shapeId: string) {
  const page = { ...TLDR.getPage(data, data.appState.currentPageId) }

  const { points, point } = Utils.deepClone(page.shapes[shapeId]) as DrawShape

  return {
    id: shapeId,
    point,
    points,
  }
}

export type DrawSnapshot = ReturnType<typeof getDrawSnapshot>
