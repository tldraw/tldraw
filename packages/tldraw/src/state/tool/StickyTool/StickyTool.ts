import Vec from '@tldraw/vec'
import type { TLPointerEventHandler } from '@tldraw/core'
import { Utils } from '@tldraw/core'
import { Sticky } from '~shape/shapes'
import { TLDrawShapeType } from '~types'
import { BaseTool } from '../BaseTool'

enum Status {
  Idle = 'idle',
  Creating = 'creating',
}

export class StickyTool extends BaseTool {
  type = TLDrawShapeType.Sticky

  status = Status.Idle

  /* --------------------- Methods -------------------- */

  private setStatus(status: Status) {
    this.status = status
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

      this.state.setEditingId(id)

      this.setStatus(Status.Creating)
    }
  }
}
