import { Vec } from '@tldraw/vec'
import { SessionType, ShapesWithProp, TLDrawCommand, TLDrawPatch, TLDrawStatus } from '~types'
import { TLDR } from '~state/TLDR'
import { BaseSession } from '../BaseSession'
import type { TLDrawApp } from '../../internal'

export class HandleSession extends BaseSession {
  type = SessionType.Handle
  status = TLDrawStatus.TranslatingHandle
  commandId: string
  topLeft: number[]
  shiftKey = false
  initialShape: ShapesWithProp<'handles'>
  handleId: string

  constructor(app: TLDrawApp, shapeId: string, handleId: string, commandId = 'move_handle') {
    super(app)
    const {
      mutables: { originPoint },
    } = app
    this.topLeft = [...originPoint]
    this.handleId = handleId
    this.initialShape = this.app.getShape(shapeId)
    this.commandId = commandId
  }

  start = (): TLDrawPatch | undefined => void null

  update = (): TLDrawPatch | undefined => {
    const {
      initialShape,
      app: {
        currentPageId,
        mutables: { currentPoint, shiftKey, altKey, metaKey },
      },
    } = this

    const shape = this.app.getShape<ShapesWithProp<'handles'>>(initialShape.id)

    if (shape.isLocked) return void null

    const handles = shape.handles

    const handleId = this.handleId as keyof typeof handles

    const delta = Vec.sub(currentPoint, handles[handleId].point)

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

    if (!change) return

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

  cancel = (): TLDrawPatch | undefined => {
    const {
      initialShape,
      app: { currentPageId },
    } = this

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

  complete = (): TLDrawPatch | TLDrawCommand | undefined => {
    const {
      initialShape,
      app: { currentPageId },
    } = this

    return {
      id: this.commandId,
      before: {
        document: {
          pages: {
            [currentPageId]: {
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
            [currentPageId]: {
              shapes: {
                [initialShape.id]: TLDR.onSessionComplete(this.app.getShape(this.initialShape.id)),
              },
            },
          },
        },
      },
    }
  }
}
