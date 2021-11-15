import Vec from '@tldraw/vec'
import type { TLPointerEventHandler } from '@tldraw/core'
import { Utils } from '@tldraw/core'
import { Sticky } from '~state/shapes'
import { SessionType, TLDrawShapeType } from '~types'
import { BaseTool, Status } from '../BaseTool'

export class StickyTool extends BaseTool {
  type = TLDrawShapeType.Sticky as const

  shapeId?: string

  /* ----------------- Event Handlers ----------------- */

  onPointerDown: TLPointerEventHandler = () => {
    if (this.status === Status.Creating) {
      this.setStatus(Status.Idle)

      if (!this.app.appState.isToolLocked) {
        this.app.selectTool('select')
      }

      return
    }

    if (this.status === Status.Idle) {
      const {
        mutables: { currentPoint },
        appState: { currentPageId, currentStyle },
      } = this.app

      const childIndex = this.getNextChildIndex()

      const id = Utils.uniqueId()

      this.shapeId = id

      const newShape = Sticky.create({
        id,
        parentId: currentPageId,
        childIndex,
        point: currentPoint,
        style: { ...currentStyle },
      })

      const bounds = Sticky.getBounds(newShape)

      newShape.point = Vec.sub(newShape.point, [bounds.width / 2, bounds.height / 2])

      this.app.createShapes(newShape)

      this.app.startSession(SessionType.Translate)

      this.setStatus(Status.Creating)
    }
  }

  onPointerUp: TLPointerEventHandler = () => {
    if (this.status === Status.Creating) {
      this.setStatus(Status.Idle)
      this.app.completeSession()
      this.app.selectTool('select')
      this.app.setEditingId(this.shapeId)
    }
  }
}
