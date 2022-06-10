import { Utils, TLPointerEventHandler } from '@tldraw/core'
import Vec from '@tldraw/vec'
import { Arrow } from '~state/shapes'
import { SessionType, TDShapeType } from '~types'
import { BaseTool, Status } from '../BaseTool'

export class ArrowTool extends BaseTool {
  type = TDShapeType.Arrow as const

  /* ----------------- Event Handlers ----------------- */

  onPointerDown: TLPointerEventHandler = () => {
    if (this.status !== Status.Idle) return

    const {
      currentPoint,
      appState: { currentPageId, currentStyle },
      isShowingGrid,
      getClosestGridSnap,
    } = this.app

    const childIndex = this.getNextChildIndex()

    const id = Utils.uniqueId()

    const newShape = Arrow.create({
      id,
      parentId: currentPageId,
      childIndex,
      point: isShowingGrid(currentPageId) ? getClosestGridSnap(currentPageId, currentPoint).point : currentPoint,
      style: { ...currentStyle },
    })

    this.app.patchCreate([newShape])

    this.app.startSession(SessionType.Arrow, newShape.id, 'end', true)

    this.setStatus(Status.Creating)
  }
}
