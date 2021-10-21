import Vec from '@tldraw/vec'
import type { TLPointerEventHandler, TLKeyboardEventHandler } from '@tldraw/core'
import { TLDrawShapeType } from '~types'
import { BaseTool, Status } from '../BaseTool'

export class TextTool extends BaseTool {
  type = TLDrawShapeType.Text

  /* --------------------- Methods -------------------- */

  stopEditingShape = () => {
    this.setStatus(Status.Idle)

    if (!this.state.appState.isToolLocked) {
      this.state.selectTool('select')
    }
  }

  /* ----------------- Event Handlers ----------------- */

  onKeyUp: TLKeyboardEventHandler = () => {
    // noop
  }

  onKeyDown: TLKeyboardEventHandler = () => {
    // noop
  }

  onPointerDown: TLPointerEventHandler = (info) => {
    if (this.status === Status.Creating) {
      this.stopEditingShape()
      return
    }

    if (this.status === Status.Idle) {
      const point = Vec.round(this.state.getPagePoint(info.point))
      this.state.createTextShapeAtPoint(point)
      this.setStatus(Status.Creating)
      return
    }
  }

  onPointerUp: TLPointerEventHandler = () => {
    // noop important!
  }

  onPointShape: TLPointerEventHandler = (info) => {
    const shape = this.state.getShape(info.target)
    if (shape.type === TLDrawShapeType.Text) {
      this.setStatus(Status.Idle)
      this.state.setEditingId(shape.id)
    }
  }
}
