import { ArrowShape, Data, LineShape, RayShape } from 'types'
import * as vec from 'utils/vec'
import BaseSession from './base-session'
import commands from 'state/commands'
import { current } from 'immer'
import { getBoundsFromPoints, getPage } from 'utils/utils'
import { getShapeUtils } from 'lib/shape-utils'

export default class PointsSession extends BaseSession {
  points: number[][]
  origin: number[]
  snapshot: ArrowSnapshot
  isLocked: boolean
  lockedDirection: 'horizontal' | 'vertical'

  constructor(data: Data, id: string, point: number[], isLocked: boolean) {
    super(data)
    this.origin = point
    this.points = [[0, 0]]
    this.snapshot = getArrowSnapshot(data, id)
  }

  update(data: Data, point: number[], isLocked = false) {
    const { id } = this.snapshot

    const delta = vec.vec(this.origin, point)

    if (isLocked) {
      if (!this.isLocked && this.points.length > 1) {
        this.isLocked = true

        if (Math.abs(delta[0]) < Math.abs(delta[1])) {
          this.lockedDirection = 'vertical'
        } else {
          this.lockedDirection = 'horizontal'
        }
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

    const shape = getPage(data).shapes[id] as ArrowShape

    getShapeUtils(shape).onHandleMove(shape, {
      end: {
        ...shape.handles.end,
        point: vec.sub(point, shape.point),
      },
    })
  }

  cancel(data: Data) {
    const { id, initialShape } = this.snapshot

    const shape = getPage(data).shapes[id] as ArrowShape

    getShapeUtils(shape)
      .onHandleMove(shape, { end: initialShape.handles.end })
      .translateTo(shape, initialShape.point)
  }

  complete(data: Data) {
    const { id } = this.snapshot

    const shape = getPage(data).shapes[id] as ArrowShape

    const { start, end, bend } = shape.handles

    // Normalize point and handles

    const bounds = getBoundsFromPoints([start.point, end.point])
    const corner = [bounds.minX, bounds.minY]

    const newPoint = vec.add(shape.point, corner)

    const nextHandles = {
      start: { ...start, point: vec.sub(start.point, corner) },
      end: { ...end, point: vec.sub(end.point, corner) },
      bend: { ...bend, point: vec.sub(bend.point, corner) },
    }

    getShapeUtils(shape)
      .setProperty(shape, 'points', [
        nextHandles.start.point,
        nextHandles.end.point,
      ])
      .setProperty(shape, 'handles', nextHandles)
      .translateTo(shape, newPoint)
      .onHandleMove(shape, nextHandles)

    commands.arrow(
      data,
      this.snapshot,
      getArrowSnapshot(data, this.snapshot.id)
    )
  }
}

export function getArrowSnapshot(data: Data, id: string) {
  const initialShape = getPage(current(data)).shapes[id] as ArrowShape

  return {
    id,
    initialShape,
    selectedIds: new Set(data.selectedIds),
    currentPageId: data.currentPageId,
  }
}

export type ArrowSnapshot = ReturnType<typeof getArrowSnapshot>
