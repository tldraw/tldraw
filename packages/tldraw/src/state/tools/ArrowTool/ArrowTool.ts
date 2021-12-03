import { Utils, TLPointerEventHandler } from '@tldraw/core'
import { Arrow } from '~state/shapes'
import { SessionType, TDShapeType } from '~types'
import { BaseTool, Status } from '../BaseTool'

export class ArrowTool extends BaseTool {
  type = TDShapeType.Arrow as const

  /* ----------------- Event Handlers ----------------- */

  onEnter = () => {
    this.setStatus(Status.Idle)
    this.app.cursorManager.showArrow()
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

    const newShape = Arrow.create({
      id,
      parentId: currentPageId,
      childIndex,
      point: currentPoint,
      style: { ...currentStyle },
    })

    this.app.patchCreate([newShape])

    this.app.startSession(SessionType.Arrow, newShape.id, 'end', true)

    this.setStatus(Status.Creating)
  }
}
