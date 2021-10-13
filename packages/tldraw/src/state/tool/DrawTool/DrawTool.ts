import Vec from '@tldraw/vec'
import type { TLPointerEventHandler } from '~../../core/src/types'
import Utils from '~../../core/src/utils'
import { Draw } from '~shape/shapes'
import { SessionType, TLDrawShapeType } from '~types'
import { BaseTool } from '../BaseTool'

enum Status {
  Idle = 'idle',
  Creating = 'creating',
}

export class DrawTool extends BaseTool {
  type = TLDrawShapeType.Draw

  status = Status.Idle

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

    const newShape = Draw.create({
      id,
      parentId: currentPageId,
      childIndex,
      point: pagePoint,
      style: { ...currentStyle },
    })

    this.state.createShapes(newShape)

    this.state.startSession(SessionType.Draw, pagePoint, id)

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
