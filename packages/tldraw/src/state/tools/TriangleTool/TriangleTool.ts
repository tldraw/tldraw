import { Utils, TLPointerEventHandler, TLBoundsCorner } from '@tldraw/core'
import Vec from '@tldraw/vec'
import { Triangle } from '~state/shapes'
import { SessionType, TDShapeType } from '~types'
import { BaseTool, Status } from '../BaseTool'

export class TriangleTool extends BaseTool {
  type = TDShapeType.Triangle as const

  /* ----------------- Event Handlers ----------------- */

  onPointerDown: TLPointerEventHandler = () => {
    if (this.app.readOnly) return
    if (this.status !== Status.Idle) return

    const {
      currentPoint,
      appState: { currentPageId, currentStyle },
      isShowingGrid,
      getClosestGridSnap,
    } = this.app

    const childIndex = this.getNextChildIndex()

    const id = Utils.uniqueId()

    const newShape = Triangle.create({
      id,
      parentId: currentPageId,
      childIndex,
      point: isShowingGrid(currentPageId) ? getClosestGridSnap(currentPageId, currentPoint).point : currentPoint,
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
