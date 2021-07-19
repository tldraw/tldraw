import { Data, Shape } from 'types'
import vec from 'utils/vec'
import BaseSession from './base-session'
import commands from 'state/commands'
import tld from 'utils/tld'
import { getShapeUtils } from 'state/shape-utils'
import { deepClone } from 'utils'

export default class HandleSession extends BaseSession {
  delta = [0, 0]
  origin: number[]
  shiftKey: boolean
  initialShape: Shape
  handleId: string
  isCreating: boolean

  constructor(
    data: Data,
    shapeId: string,
    handleId: string,
    point: number[],
    isCreating: boolean
  ) {
    super(data)
    this.origin = point
    this.handleId = handleId
    this.initialShape = deepClone(tld.getShape(data, shapeId))
    this.isCreating = isCreating
  }

  update(
    data: Data,
    point: number[],
    shiftKey: boolean,
    altKey: boolean,
    metaKey: boolean
  ): void {
    const shape = tld.getShape(data, this.initialShape.id)

    tld.assertShapeHasProperty(shape, 'handles')

    this.shiftKey = shiftKey

    const delta = vec.vec(this.origin, point)

    const handles = this.initialShape.handles

    getShapeUtils(shape).onHandleChange(
      shape,
      {
        [this.handleId]: {
          ...shape.handles[this.handleId],
          point: vec.round(vec.add(handles[this.handleId].point, delta)), // vec.rot(delta, shape.rotation)),
        },
      },
      { delta, shiftKey, altKey, metaKey }
    )
  }

  cancel(data: Data): void {
    if (this.isCreating) {
      tld.deleteShapes(data, [this.initialShape])
    } else {
      tld.getPage(data).shapes[this.initialShape.id] = this.initialShape
    }
  }

  complete(data: Data): void {
    const before = this.initialShape
    const after = deepClone(tld.getShape(data, before.id))
    if (this.isCreating) {
      commands.createShapes(data, [after])
    } else {
      commands.mutate(data, [before], [after])
    }
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getHandleSnapshot(data: Data, shapeId: string) {
  return deepClone(tld.getShape(data, shapeId))
}

export type HandleSnapshot = ReturnType<typeof getHandleSnapshot>
