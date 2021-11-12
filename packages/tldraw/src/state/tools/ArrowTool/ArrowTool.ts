import Vec from '@tldraw/vec'
import { Utils, TLPointerEventHandler } from '@tldraw/core'
import { Arrow } from '~state/shapes'
import { SessionType, TLDrawShapeType } from '~types'
import { BaseTool, Status } from '../BaseTool'

export class ArrowTool extends BaseTool {
  type = TLDrawShapeType.Arrow as const

  /* ----------------- Event Handlers ----------------- */

  onPointerDown: TLPointerEventHandler = (info) => {
    const pagePoint = Vec.round(this.state.getPagePoint(info.point))

    const {
      appState: { currentPageId, currentStyle },
    } = this.state

    const childIndex = this.getNextChildIndex()

    const id = Utils.uniqueId()

    const newShape = Arrow.create({
      id,
      parentId: currentPageId,
      childIndex,
      point: pagePoint,
      style: { ...currentStyle },
    })

    this.state.patchCreate([newShape])

    this.state.startSession(SessionType.Arrow, pagePoint, 'end', true)

    this.setStatus(Status.Creating)
  }
}
