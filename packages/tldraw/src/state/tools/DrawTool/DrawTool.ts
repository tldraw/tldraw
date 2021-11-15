import { Utils, TLPointerEventHandler } from '@tldraw/core'
import { Draw } from '~state/shapes'
import { SessionType, TLDrawShapeType } from '~types'
import { BaseTool, Status } from '../BaseTool'

export class DrawTool extends BaseTool {
  type = TLDrawShapeType.Draw as const

  /* ----------------- Event Handlers ----------------- */

  onPointerDown: TLPointerEventHandler = (info) => {
    const {
      shapes,
      mutables: { currentPoint },
      appState: { currentPageId, currentStyle },
    } = this.app

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
      point: [...currentPoint, info.pressure || 0.5],
      style: { ...currentStyle },
    })

    this.app.patchCreate([newShape])

    this.app.startSession(SessionType.Draw, id)

    this.setStatus(Status.Creating)
  }

  onPointerMove: TLPointerEventHandler = () => {
    if (this.status === Status.Creating) {
      this.app.updateSession()
    }
  }

  onPointerUp: TLPointerEventHandler = () => {
    if (this.status === Status.Creating) {
      this.app.completeSession()
    }

    this.setStatus(Status.Idle)
  }
}
