import { Vec } from '@tldraw/vec'
import type { TLBounds } from '@tldraw/core'
import { SessionType, ShapesWithProp, TLDrawStatus } from '~types'
import { Session } from '~types'
import type { TLDrawSnapshot } from '~types'
import { TLDR } from '~state/TLDR'

export class HandleSession extends Session {
  static type = SessionType.Handle
  status = TLDrawStatus.TranslatingHandle
  commandId: string
  delta = [0, 0]
  topLeft: number[]
  origin: number[]
  shiftKey = false
  initialShape: ShapesWithProp<'handles'>
  handleId: string

  constructor(
    data: TLDrawSnapshot,
    viewport: TLBounds,
    point: number[],
    handleId: string,
    commandId = 'move_handle'
  ) {
    super(viewport)
    const { currentPageId } = data.appState
    const shapeId = TLDR.getSelectedIds(data, currentPageId)[0]
    this.topLeft = point
    this.origin = point
    this.handleId = handleId
    this.initialShape = TLDR.getShape(data, shapeId, currentPageId)
    this.commandId = commandId
  }

  start = () => void null

  update = (
    data: TLDrawSnapshot,
    point: number[],
    shiftKey = false,
    altKey = false,
    metaKey = false
  ) => {
    const { initialShape } = this
    const { currentPageId } = data.appState

    const shape = TLDR.getShape<ShapesWithProp<'handles'>>(data, initialShape.id, currentPageId)

    const handles = shape.handles

    const handleId = this.handleId as keyof typeof handles

    const delta = Vec.sub(point, handles[handleId].point)

    const handle = {
      ...handles[handleId],
      point: Vec.sub(Vec.add(handles[handleId].point, delta), shape.point),
    }

    // First update the handle's next point

    const change = TLDR.getShapeUtils(shape).onHandleChange?.(
      shape,
      {
        [handleId]: handle,
      },
      { delta, shiftKey, altKey, metaKey }
    )

    if (!change) return data

    return {
      document: {
        pages: {
          [currentPageId]: {
            shapes: {
              [shape.id]: change,
            },
          },
        },
      },
    }
  }

  cancel = (data: TLDrawSnapshot) => {
    const { initialShape } = this
    const { currentPageId } = data.appState

    return {
      document: {
        pages: {
          [currentPageId]: {
            shapes: {
              [initialShape.id]: initialShape,
            },
          },
        },
      },
    }
  }

  complete = (data: TLDrawSnapshot) => {
    const { initialShape } = this
    const pageId = data.appState.currentPageId

    return {
      id: this.commandId,
      before: {
        document: {
          pages: {
            [pageId]: {
              shapes: {
                [initialShape.id]: initialShape,
              },
            },
          },
        },
      },
      after: {
        document: {
          pages: {
            [pageId]: {
              shapes: {
                [initialShape.id]: TLDR.onSessionComplete(
                  TLDR.getShape(data, this.initialShape.id, pageId)
                ),
              },
            },
          },
        },
      },
    }
  }
}
