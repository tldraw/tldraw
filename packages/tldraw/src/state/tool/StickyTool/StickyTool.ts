import Vec from '@tldraw/vec'
import type { TLPointerEventHandler } from '@tldraw/core'
import { Utils } from '@tldraw/core'
import { Sticky } from '~shape/shapes'
import { SessionType, TLDrawShapeType } from '~types'
import { BaseTool, Status } from '../BaseTool'

export class StickyTool extends BaseTool {
  type = TLDrawShapeType.Sticky

  shapeId?: string

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
        appState: { currentPageId, currentStyle },
      } = this.state

      const childIndex = this.getNextChildIndex()

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

  onPointerUp: TLPointerEventHandler = () => {
    if (this.status === Status.Creating) {
      this.state.completeSession()
      this.setStatus(Status.Idle)
      this.state.setEditingId(this.shapeId)
    }
  }
}
