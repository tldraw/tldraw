import { Data } from 'types'
import * as vec from 'utils/vec'
import BaseSession from './base-session'
import commands from 'state/commands'
import { current } from 'immer'
import { getPage } from 'utils/utils'
import { getShapeUtils } from 'lib/shape-utils'

export default class HandleSession extends BaseSession {
  delta = [0, 0]
  origin: number[]
  snapshot: HandleSnapshot

  constructor(data: Data, shapeId: string, handleId: string, point: number[]) {
    super(data)
    this.origin = point
    this.snapshot = getHandleSnapshot(data, shapeId, handleId)
  }

  update(data: Data, point: number[], isAligned: boolean) {
    const { currentPageId, handleId, initialShape } = this.snapshot
    const shape = getPage(data, currentPageId).shapes[initialShape.id]

    const delta = vec.vec(this.origin, point)

    if (isAligned) {
      if (Math.abs(delta[0]) < Math.abs(delta[1])) {
        delta[0] = 0
      } else {
        delta[1] = 0
      }
    }

    const handles = initialShape.handles

    getShapeUtils(shape).onHandleChange(shape, {
      [handleId]: {
        ...handles[handleId],
        point: vec.add(handles[handleId].point, delta),
      },
    })
  }

  cancel(data: Data) {
    const { currentPageId, handleId, initialShape } = this.snapshot
    const shape = getPage(data, currentPageId).shapes[initialShape.id]
  }

  complete(data: Data) {
    commands.handle(
      data,
      this.snapshot,
      getHandleSnapshot(
        data,
        this.snapshot.initialShape.id,
        this.snapshot.handleId
      )
    )
  }
}

export function getHandleSnapshot(
  data: Data,
  shapeId: string,
  handleId: string
) {
  const initialShape = getPage(current(data)).shapes[shapeId]

  return {
    currentPageId: data.currentPageId,
    handleId,
    initialShape,
  }
}

export type HandleSnapshot = ReturnType<typeof getHandleSnapshot>
