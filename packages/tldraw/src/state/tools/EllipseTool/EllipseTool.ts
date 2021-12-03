import { Utils, TLPointerEventHandler, TLBoundsCorner } from '@tldraw/core'
import { Ellipse } from '~state/shapes'
import { SessionType, TDShapeType } from '~types'
import { BaseTool, Status } from '../BaseTool'

export class EllipseTool extends BaseTool {
  type = TDShapeType.Ellipse as const

  /* ----------------- Event Handlers ----------------- */

  onEnter = () => {
    this.setStatus(Status.Idle)
    this.app.cursorManager.showCircle()
  }

  onExit = () => {
    this.setStatus(Status.Idle)
    this.app.cursorManager.showPrevious()
  }

  onPointerDown: TLPointerEventHandler = () => {
    const {
      currentPoint,
      appState: { currentPageId, currentStyle },
    } = this.app

    const childIndex = this.getNextChildIndex()

    const id = Utils.uniqueId()

    const newShape = Ellipse.create({
      id,
      parentId: currentPageId,
      childIndex,
      point: currentPoint,
      style: { ...currentStyle },
    })

    this.app.patchCreate([newShape])

    this.app.startSession(
      SessionType.TransformSingle,
      newShape.id,
      TLBoundsCorner.BottomRight,
      true
    )

    this.setStatus(Status.Creating)
  }
}
