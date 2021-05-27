import { current } from "immer"
import { Data, DrawShape } from "types"
import BaseSession from "./base-session"
import { getShapeUtils } from "lib/shape-utils"
import { getPage } from "utils/utils"
import * as vec from "utils/vec"
import commands from "state/commands"

export default class BrushSession extends BaseSession {
  origin: number[]
  points: number[][]
  snapshot: DrawSnapshot
  shapeId: string

  constructor(data: Data, id: string, point: number[]) {
    super(data)
    this.shapeId = id
    this.origin = point
    this.points = [[0, 0]]
    this.snapshot = getDrawSnapshot(data, id)

    const page = getPage(data)
    const shape = page.shapes[id]
    getShapeUtils(shape).translateTo(shape, point)
  }

  update = (data: Data, point: number[]) => {
    const { shapeId } = this

    this.points.push(vec.sub(point, this.origin))

    const page = getPage(data)
    const shape = page.shapes[shapeId]
    getShapeUtils(shape).setPoints!(shape, [...this.points])
  }

  cancel = (data: Data) => {
    const { shapeId, snapshot } = this
    const page = getPage(data)
    const shape = page.shapes[shapeId]
    getShapeUtils(shape).setPoints!(shape, snapshot.points)
  }

  complete = (data: Data) => {
    commands.points(data, this.shapeId, this.snapshot.points, this.points)
  }
}

export function getDrawSnapshot(data: Data, shapeId: string) {
  const page = getPage(current(data))
  const { points } = page.shapes[shapeId] as DrawShape
  return {
    points,
  }
}

export type DrawSnapshot = ReturnType<typeof getDrawSnapshot>
