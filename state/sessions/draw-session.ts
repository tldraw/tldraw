import { current } from 'immer'
import { Data, DrawShape } from 'types'
import BaseSession from './base-session'
import { getShapeUtils } from 'lib/shape-utils'
import { getPage, simplify } from 'utils/utils'
import * as vec from 'utils/vec'
import commands from 'state/commands'

export default class BrushSession extends BaseSession {
  origin: number[]
  previous: number[]
  points: number[][]
  snapshot: DrawSnapshot

  constructor(data: Data, id: string, point: number[]) {
    super(data)
    this.origin = point
    this.previous = point
    this.points = []
    this.snapshot = getDrawSnapshot(data, id)

    const page = getPage(data)
    const shape = page.shapes[id]
    getShapeUtils(shape).translateTo(shape, point)
  }

  update = (data: Data, point: number[]) => {
    const { snapshot } = this

    const lp = vec.med(this.previous, vec.toPrecision(point))
    this.points.push(vec.sub(lp, this.origin))
    this.previous = lp

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
