import Vec from '@tldraw/vec'
import type { TLPointerEventHandler } from '@tldraw/core'
import { Utils } from '@tldraw/core'
import { Sticky } from '~shape/shapes'
import { SessionType, TLDrawShapeType } from '~types'
import { BaseTool } from '../BaseTool'

enum Status {
  Idle = 'idle',
  Creating = 'creating',
}

export class StickyTool extends BaseTool {
  type = TLDrawShapeType.Sticky

  status = Status.Idle

  shapeId?: string

  /* --------------------- Methods -------------------- */

  private setStatus(status: Status) {
    this.status = status
  }

  onEnter = () => {
    this.setStatus(Status.Idle)
  }

  onExit = () => {
    this.setStatus(Status.Idle)
  }

  /* ----------------- Event Handlers ----------------- */

  onPointerDown: TLPointerEventHandler = (info) => {
    if (this.status === Status.Creating) {
      this.setStatus(Status.Idle)

      if (!this.state.appState.isToolLocked) {
        this.state.selectTool('select')
      }

      return
    }

    if (this.status === Status.Idle) {
      const pagePoint = Vec.round(this.state.getPagePoint(info.point))

      const {
        shapes,
        appState: { currentPageId, currentStyle },
      } = this.state

      const childIndex =
        shapes.length === 0
          ? 1
          : shapes
              .filter((shape) => shape.parentId === currentPageId)
              .sort((a, b) => b.childIndex - a.childIndex)[0].childIndex + 1

      const id = Utils.uniqueId()

      this.shapeId = id

      const newShape = Sticky.create({
        id,
        parentId: currentPageId,
        childIndex,
        point: pagePoint,
        style: { ...currentStyle },
      })

      const bounds = Sticky.getBounds(newShape)

      newShape.point = Vec.sub(newShape.point, [bounds.width / 2, bounds.height / 2])

      this.state.createShapes(newShape)

      this.state.startSession(SessionType.Translate, pagePoint)

      this.setStatus(Status.Creating)
    }
  }

  onPointerMove: TLPointerEventHandler = (info) => {
    if (this.status === Status.Creating) {
      const pagePoint = Vec.round(this.state.getPagePoint(info.point))
      this.state.updateSession(pagePoint, info.shiftKey, info.altKey, info.metaKey)
    }
  }

  onPointerUp: TLPointerEventHandler = () => {
    if (this.status === Status.Creating) {
      this.state.completeSession()
      this.setStatus(Status.Idle)
      this.state.setEditingId(this.shapeId)
    }
  }
}
