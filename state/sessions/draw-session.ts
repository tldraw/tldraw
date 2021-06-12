import { current } from 'immer'
import { Data, DrawShape } from 'types'
import BaseSession from './base-session'
import { getShapeUtils } from 'lib/shape-utils'
import { getPage, getShape, isMobile, updateParents } from 'utils/utils'
import * as vec from 'utils/vec'
import commands from 'state/commands'

let prevEndPoint: number[]

export default class BrushSession extends BaseSession {
  origin: number[]
  previous: number[]
  last: number[]
  points: number[][]
  snapshot: DrawSnapshot
  isLocked: boolean
  lockedDirection: 'horizontal' | 'vertical'

  constructor(data: Data, id: string, point: number[], isLocked = false) {
    super(data)
    this.origin = point
    this.previous = point
    this.last = point
    this.snapshot = getDrawSnapshot(data, id)

    // Add a first point but don't update the shape yet. We'll update
    // when the draw session ends; if the user hasn't added additional
    // points, this single point will be interpreted as a "dot" shape.
    this.points = [[0, 0]]

    const shape = getPage(data).shapes[id]

    getShapeUtils(shape).translateTo(shape, point)

    updateParents(data, [shape.id])
  }

  update = (
    data: Data,
    point: number[],
    pressure: number,
    isLocked = false
  ) => {
    const { snapshot } = this

    const delta = vec.vec(this.origin, point)

    // Drawing while holding shift will "lock" the pen to either the
    // x or y axis, depending on which direction has the greater
    // delta. Pressing shift will also add more points to "return"
    // the pen to the axis.
    if (isLocked) {
      if (!this.isLocked && this.points.length > 1) {
        this.isLocked = true
        const returning = [...this.previous]

        const isVertical = Math.abs(delta[0]) < Math.abs(delta[1])

        if (isVertical) {
          this.lockedDirection = 'vertical'
          returning[0] = this.origin[0]
        } else {
          this.lockedDirection = 'horizontal'
          returning[1] = this.origin[1]
        }

        this.previous = returning
        this.points.push(vec.sub(returning, this.origin))
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
    const nextPrev = vec.med(this.previous, point)

    // A delta to project the projected point
    const offset = vec.sub(nextPrev, this.previous)

    this.previous = nextPrev

    // Generate some temporary points towards a projected point
    const temporaryPoints = [0.7, 0.9, 0.95, 1].map((v) =>
      vec.round([
        ...vec.sub(
          vec.lrp(this.previous, vec.add(point, offset), v),
          this.origin
        ),
        pressure,
      ])
    )

    // Don't add duplicate points. It's important to test against the
    // adjusted (low-passed) point rather than the input point.

    const newPoint = vec.round([
      ...vec.sub(this.previous, this.origin),
      pressure,
    ])

    if (vec.isEqual(this.last, newPoint)) return

    this.last = newPoint

    this.points.push(newPoint)

    // We draw a dot when the number of points is 1 or 2, so this guard
    // prevents a "flash" of a dot when a user begins drawing a line.
    if (this.points.length <= 2) return

    // If the delta between the averaged point and the real point is
    // too great, skip the temporary points. This avoids "sawblading".
    const tooFarForTemporaryPoints =
      isMobile() || vec.dist(newPoint, temporaryPoints[3]) > 32

    // Update the points and update the shape's parents.
    const shape = getShape(data, snapshot.id) as DrawShape

    getShapeUtils(shape).setProperty(
      shape,
      'points',
      tooFarForTemporaryPoints
        ? [...this.points]
        : [...this.points, ...temporaryPoints]
    )

    updateParents(data, [shape.id])
  }

  cancel = (data: Data) => {
    const { snapshot } = this
    const shape = getShape(data, snapshot.id) as DrawShape
    getShapeUtils(shape).setProperty(shape, 'points', snapshot.points)
    updateParents(data, [shape.id])
  }

  complete = (data: Data) => {
    const { snapshot } = this
    const page = getPage(data)
    const shape = page.shapes[snapshot.id] as DrawShape

    if (shape.points.length < this.points.length) {
      getShapeUtils(shape).setProperty(shape, 'points', this.points)
    }

    getShapeUtils(shape).onSessionComplete(shape)

    updateParents(data, [shape.id])

    commands.draw(data, this.snapshot.id)
  }
}

export function getDrawSnapshot(data: Data, shapeId: string) {
  const page = getPage(current(data))
  const { points } = page.shapes[shapeId] as DrawShape

  return {
    id: shapeId,
    points,
  }
}

export type DrawSnapshot = ReturnType<typeof getDrawSnapshot>
