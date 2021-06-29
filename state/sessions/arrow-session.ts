import { ArrowShape, Data } from 'types'
import vec from 'utils/vec'
import BaseSession from './base-session'
import commands from 'state/commands'
import { deepClone, getBoundsFromPoints, setToArray } from 'utils'
import { getShapeUtils } from 'state/shape-utils'
import tld from 'utils/tld'

export default class ArrowSession extends BaseSession {
  points: number[][]
  origin: number[]
  snapshot: ArrowSnapshot
  isLocked: boolean
  lockedDirection: 'horizontal' | 'vertical'

  constructor(data: Data, id: string, point: number[], isLocked: boolean) {
    super(data)
    isLocked
    this.origin = point
    this.points = [[0, 0]]
    this.snapshot = getArrowSnapshot(data, id)
  }

  update(data: Data, point: number[], isLocked = false): void {
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

    const shape = tld.getPage(data).shapes[id] as ArrowShape

    getShapeUtils(shape).onHandleChange(shape, {
      end: {
        ...shape.handles.end,
        point: vec.sub(point, shape.point),
      },
    })

    tld.updateParents(data, [shape.id])
  }

  cancel(data: Data): void {
    const { id, initialShape } = this.snapshot

    const shape = tld.getPage(data).shapes[id] as ArrowShape

    getShapeUtils(shape)
      .onHandleChange(shape, { end: initialShape.handles.end })
      .setProperty(shape, 'point', initialShape.point)

    tld.updateParents(data, [shape.id])
  }

  complete(data: Data): void {
    const { id } = this.snapshot

    const shape = tld.getPage(data).shapes[id] as ArrowShape

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
      .setProperty(shape, 'handles', nextHandles)
      .setProperty(shape, 'point', newPoint)
      .onHandleChange(shape, nextHandles)

    commands.arrow(
      data,
      this.snapshot,
      getArrowSnapshot(data, this.snapshot.id)
    )
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getArrowSnapshot(data: Data, id: string) {
  const initialShape = deepClone(tld.getPage(data).shapes[id]) as ArrowShape

  return {
    id,
    initialShape,
    selectedIds: setToArray(tld.getSelectedIds(data)),
    currentPageId: data.currentPageId,
  }
}

export type ArrowSnapshot = ReturnType<typeof getArrowSnapshot>
