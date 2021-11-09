import Vec from '@tldraw/vec'
import type { TLPointerEventHandler, TLKeyboardEventHandler } from '@tldraw/core'
import { TLDrawShapeType } from '~types'
import { BaseTool, Status } from '../BaseTool'
import { deleteShapes } from '~state/commands'

export class TextTool extends BaseTool {
  type = TLDrawShapeType.Text
  editingStartTime = -1

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
      this.editingStartTime = Date.now()
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
      this.editingStartTime = Date.now()
    }
  }

  onShapeBlur = () => {
    // This prevents an auto-blur event from Safari
    if (Date.now() - this.editingStartTime < 50) return

    this.stopEditingShape()

    const { editingId } = this.state.pageState

    if (editingId) {
      // If we're editing text, then delete the text if it's empty
      const shape = this.state.getShape(editingId)
      this.state.setEditingId()

      if (shape.type === TLDrawShapeType.Text) {
        this.state.select(editingId)
        if (shape.text.trim().length <= 0) {
          this.state.delete()
        }
      }
    }
  }
}
