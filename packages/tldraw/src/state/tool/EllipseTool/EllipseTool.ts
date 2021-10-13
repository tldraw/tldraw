import Vec from '@tldraw/vec'
import { Utils, TLPointerEventHandler, TLBoundsCorner } from '@tldraw/core'
import { Ellipse } from '~shape/shapes'
import { SessionType, TLDrawShapeType } from '~types'
import { BaseTool } from '../BaseTool'

enum Status {
  Idle = 'idle',
  Creating = 'creating',
}
export class EllipseTool extends BaseTool {
  type = TLDrawShapeType.Ellipse

  status = Status.Idle

  /* --------------------- Methods -------------------- */

  private setStatus(status: Status) {
    this.status = status
  }

  /* ----------------- Event Handlers ----------------- */

  onPointerDown: TLPointerEventHandler = (info) => {
    const pagePoint = Vec.round(this.state.getPagePoint(info.point))

    const {
      appState: { currentPageId, currentStyle },
    } = this.state

    const childIndex = this.getNextChildIndex()

    const id = Utils.uniqueId()

    const newShape = Ellipse.create({
      id,
      parentId: currentPageId,
      childIndex,
      point: pagePoint,
      style: { ...currentStyle },
    })

    this.state.createShapes(newShape)

    this.state.startSession(SessionType.Transform, pagePoint, TLBoundsCorner.BottomRight)

    this.setStatus(Status.Creating)
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
    }

    this.setStatus(Status.Idle)
  }
}
