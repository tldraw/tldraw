import { current } from 'immer'
import { Data, DrawShape } from 'types'
import BaseSession from './base-session'
import { getShapeUtils } from 'lib/shape-utils'
import { getPage } from 'utils/utils'
import * as vec from 'utils/vec'
import commands from 'state/commands'

let prevEndPoint: number[]

export default class BrushSession extends BaseSession {
  origin: number[]
  previous: number[]
  points: number[][]
  snapshot: DrawSnapshot
  isLocked: boolean
  lockedDirection: 'horizontal' | 'vertical'

  constructor(data: Data, id: string, point: number[], isLocked = false) {
    super(data)
    this.origin = point
    this.previous = point
    this.points = []
    this.snapshot = getDrawSnapshot(data, id)

    const page = getPage(data)
    const shape = page.shapes[id]
    getShapeUtils(shape).translateTo(shape, point)
  }

  update = (data: Data, point: number[], isLocked = false) => {
    const { snapshot } = this

    const delta = vec.vec(this.origin, point)

    if (isLocked) {
      if (!this.isLocked && this.points.length > 1) {
        this.isLocked = true
        const returning = [...this.previous]

        if (Math.abs(delta[0]) < Math.abs(delta[1])) {
          this.lockedDirection = 'vertical'
          returning[0] = this.origin[0]
        } else {
          this.lockedDirection = 'horizontal'
          returning[1] = this.origin[1]
        }

        this.previous = returning
        this.points.push(vec.sub(returning, this.origin))
      }
    } else {
      if (this.isLocked) {
        this.isLocked = false
      }
    }

    if (this.isLocked) {
      if (this.lockedDirection === 'vertical') {
        point[0] = this.origin[0]
      } else {
        point[1] = this.origin[1]
      }
    }

    if (this.previous) {
      point = vec.med(this.previous, point)
    }

    prevEndPoint = [...point]
    const next = vec.sub(point, this.origin)

    this.points.push(next)
    this.previous = point

    const page = getPage(data)
    const shape = page.shapes[snapshot.id] as DrawShape

    getShapeUtils(shape).setProperty(shape, 'points', [...this.points])
  }

  cancel = (data: Data) => {
    const { snapshot } = this
    const page = getPage(data)
    const shape = page.shapes[snapshot.id] as DrawShape
    getShapeUtils(shape).setProperty(shape, 'points', snapshot.points)
  }

  complete = (data: Data) => {
    if (this.points.length > 1) {
      let minX = Infinity
      let minY = Infinity
      const pts = [...this.points]

      for (let pt of pts) {
        minX = Math.min(pt[0], minX)
        minY = Math.min(pt[1], minY)
      }

      for (let pt of pts) {
        pt[0] -= minX
        pt[1] -= minY
      }

      const { snapshot } = this
      const page = getPage(data)
      const shape = page.shapes[snapshot.id] as DrawShape

      getShapeUtils(shape)
        .setProperty(shape, 'points', pts)
        .translateTo(shape, vec.add(shape.point, [minX, minY]))
    }

    commands.draw(data, this.snapshot.id, this.points)
  }
}

export function getDrawSnapshot(data: Data, shapeId: string) {
  const page = getPage(current(data))
  const { points, style } = page.shapes[shapeId] as DrawShape
  return {
    id: shapeId,
    points,
    strokeWidth: style.strokeWidth,
  }
}

export type DrawSnapshot = ReturnType<typeof getDrawSnapshot>
