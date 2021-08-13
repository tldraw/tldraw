import { Vec } from '@tldraw/core'
import type { ShapesWithProp } from '~types'
import type { Session } from '~types'
import type { Data } from '~types'
import { TLDR } from '~state/tldr'

export class HandleSession implements Session {
  id = 'transform_single'
  commandId: string
  delta = [0, 0]
  origin: number[]
  shiftKey = false
  initialShape: ShapesWithProp<'handles'>
  handleId: string

  constructor(data: Data, handleId: string, point: number[], commandId = 'move_handle') {
    const shapeId = data.pageState.selectedIds[0]
    this.origin = point
    this.handleId = handleId
    this.initialShape = TLDR.getShape(data, shapeId)
    this.commandId = commandId
  }

  start = (data: Data) => data

  update = (
    data: Data,
    point: number[],
    shiftKey: boolean,
    altKey: boolean,
    metaKey: boolean
  ): Data => {
    const { initialShape } = this

    const shape = TLDR.getShape<ShapesWithProp<'handles'>>(data, initialShape.id)

    const handles = shape.handles

    const handleId = this.handleId as keyof typeof handles

    const delta = Vec.sub(point, handles[handleId].point)

    const handle = {
      ...handles[handleId],
      point: Vec.sub(Vec.add(handles[handleId].point, delta), shape.point),
    }

    // First update the handle's next point
    const change = TLDR.getShapeUtils(shape).onHandleChange(
      shape,
      {
        [handleId]: handle,
      },
      { delta, shiftKey, altKey, metaKey }
    )

    if (!change) return data

    return {
      ...data,
      page: {
        ...data.page,
        shapes: {
          ...data.page.shapes,
          [shape.id]: {
            ...shape,
            ...change,
          },
        },
      },
    }
  }

  cancel = (data: Data) => {
    const { initialShape } = this

    return {
      ...data,
      page: {
        ...data.page,
        shapes: {
          ...data.page.shapes,
          [initialShape.id]: initialShape,
        },
      },
    }
  }

  complete(data: Data) {
    return {
      id: this.commandId,
      before: {
        page: {
          shapes: {
            [this.initialShape.id]: this.initialShape,
          },
        },
      },
      after: {
        page: {
          shapes: {
            [this.initialShape.id]: TLDR.onSessionComplete(
              data,
              data.page.shapes[this.initialShape.id]
            ),
          },
        },
      },
    }
  }
}
