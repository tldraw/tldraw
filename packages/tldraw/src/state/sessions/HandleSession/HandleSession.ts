import { Vec } from '@tldraw/vec'
import { SessionType, ShapesWithProp, TldrawCommand, TldrawPatch, TDStatus } from '~types'
import { TLDR } from '~state/TLDR'
import { BaseSession } from '../BaseSession'
import type { TldrawApp } from '../../internal'
import { TLPerformanceMode } from '@tldraw/core'

export class HandleSession extends BaseSession {
  type = SessionType.Handle
  performanceMode = undefined
  status = TDStatus.TranslatingHandle
  commandId: string
  topLeft: number[]
  shiftKey = false
  initialShape: ShapesWithProp<'handles'>
  handleId: string

  constructor(app: TldrawApp, shapeId: string, handleId: string, commandId = 'move_handle') {
    super(app)
    const { originPoint } = app
    this.topLeft = [...originPoint]
    this.handleId = handleId
    this.initialShape = this.app.getShape(shapeId)
    this.commandId = commandId
  }

  start = (): TldrawPatch | undefined => void null

  update = (): TldrawPatch | undefined => {
    const {
      initialShape,
      app: { currentPageId, currentPoint, shiftKey, altKey, metaKey },
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
    const change = TLDR.getShapeUtil(shape).onHandleChange?.(shape, {
      [handleId]: handle,
    })

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

  cancel = (): TldrawPatch | undefined => {
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

  complete = (): TldrawPatch | TldrawCommand | undefined => {
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
