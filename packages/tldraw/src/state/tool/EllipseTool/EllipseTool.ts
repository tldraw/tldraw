import Vec from '@tldraw/vec'
import { Utils, TLPointerEventHandler, TLBoundsCorner } from '@tldraw/core'
import { Ellipse } from '~shape/shapes'
import { SessionType, TLDrawShapeType } from '~types'
import { BaseTool, Status } from '../BaseTool'

export class EllipseTool extends BaseTool {
  type = TLDrawShapeType.Ellipse

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

    this.state.patchCreate([newShape])

    this.state.startSession(
      SessionType.TransformSingle,
      pagePoint,
      TLBoundsCorner.BottomRight,
      true
    )

    this.setStatus(Status.Creating)
  }
}
