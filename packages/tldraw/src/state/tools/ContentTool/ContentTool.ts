import { Utils, TLPointerEventHandler, TLBoundsCorner } from '@tldraw/core'
import Vec from '@tldraw/vec'
import { Content } from '~state/shapes'
import { SessionType, TDShapeType } from '~types'
import { BaseTool, Status } from '../BaseTool'

export class ContentTool extends BaseTool {
  type = TDShapeType.Content as const

  /* ----------------- Event Handlers ----------------- */

  onPointerDown: TLPointerEventHandler = () => {
    if (this.app.readOnly) return
    if (this.status !== Status.Idle) return

    const {
      currentPoint,
      currentGrid,
      settings: { showGrid },
      appState: { currentPageId, currentStyle },
    } = this.app

    const childIndex = this.getNextChildIndex()

    const id = Utils.uniqueId()

    const newShape = Content.create({
      id,
      parentId: currentPageId,
      childIndex,
      point: showGrid ? Vec.snap(currentPoint, currentGrid) : currentPoint,
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
