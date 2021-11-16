import { Utils, TLPointerEventHandler, TLBoundsCorner } from '@tldraw/core'
import { Rectangle } from '~state/shapes'
import { SessionType, TldrawShapeType } from '~types'
import { BaseTool, Status } from '../BaseTool'

export class RectangleTool extends BaseTool {
  type = TldrawShapeType.Rectangle as const

  /* ----------------- Event Handlers ----------------- */

  onPointerDown: TLPointerEventHandler = () => {
    const {
      currentPoint,
      appState: { currentPageId, currentStyle },
    } = this.app

    const childIndex = this.getNextChildIndex()

    const id = Utils.uniqueId()

    const newShape = Rectangle.create({
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
