import Vec from '@tldraw/vec'
import { Utils, TLPointerEventHandler } from '@tldraw/core'
import { Arrow } from '~state/shapes'
import { SessionType, TLDrawShapeType } from '~types'
import { BaseTool, Status } from '../BaseTool'

export class ArrowTool extends BaseTool {
  type = TLDrawShapeType.Arrow as const

  /* ----------------- Event Handlers ----------------- */

  onPointerDown: TLPointerEventHandler = () => {
    const { currentPoint } = this.app.mutables
    const pagePoint = Vec.round(currentPoint)

    const {
      appState: { currentPageId, currentStyle },
    } = this.app

    const childIndex = this.getNextChildIndex()

    const id = Utils.uniqueId()

    const newShape = Arrow.create({
      id,
      parentId: currentPageId,
      childIndex,
      point: pagePoint,
      style: { ...currentStyle },
    })

    this.app.patchCreate([newShape])

    this.app.startSession(SessionType.Arrow, newShape.id, 'end', true)

    this.setStatus(Status.Creating)
  }
}
