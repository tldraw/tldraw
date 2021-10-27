import Vec from '@tldraw/vec'
import { Utils, TLPointerEventHandler } from '@tldraw/core'
import { Draw } from '~shape-utils'
import { SessionType, TLDrawShapeType } from '~types'
import { BaseTool, Status } from '../BaseTool'

export class DrawTool extends BaseTool {
  type = TLDrawShapeType.Draw

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
      point: [...pagePoint, info.pressure || 0.5],
      style: { ...currentStyle },
    })

    this.state.patchCreate([newShape])

    this.state.startSession(SessionType.Draw, pagePoint, id)

    this.setStatus(Status.Creating)
  }

  onPointerMove: TLPointerEventHandler = (info) => {
    if (this.status === Status.Creating) {
      const pagePoint = Vec.round(this.state.getPagePoint(info.point))
      this.state.updateSession(
        [...pagePoint, info.pressure || 0.5],
        info.shiftKey,
        info.altKey,
        info.metaKey
      )
    }
  }

  onPointerUp: TLPointerEventHandler = () => {
    if (this.status === Status.Creating) {
      this.state.completeSession()
    }

    this.setStatus(Status.Idle)
  }
}
