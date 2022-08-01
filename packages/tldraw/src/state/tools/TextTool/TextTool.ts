import type { TLKeyboardEventHandler, TLPointerEventHandler } from '@tldraw/core'
import Vec from '@tldraw/vec'
import { BaseTool, Status } from '~state/tools/BaseTool'
import { TDShapeType } from '~types'

export class TextTool extends BaseTool {
  type = TDShapeType.Text as const

  /* --------------------- Methods -------------------- */

  stopEditingShape = () => {
    this.setStatus(Status.Idle)

    if (!this.app.appState.isToolLocked) {
      this.app.selectTool('select')
    }
  }

  /* ----------------- Event Handlers ----------------- */

  onKeyUp: TLKeyboardEventHandler = () => {
    // noop
  }

  onKeyDown: TLKeyboardEventHandler = () => {
    // noop
  }

  onPointerDown: TLPointerEventHandler = () => {
    if (this.status === Status.Creating) {
      this.stopEditingShape()
      return
    }

    if (this.status === Status.Idle) {
      const {
        currentPoint,
        currentGrid,
        settings: { showGrid },
      } = this.app

      this.app.createTextShapeAtPoint(
        showGrid ? Vec.snap(currentPoint, currentGrid) : currentPoint,
        undefined,
        true
      )
      this.setStatus(Status.Creating)
      return
    }
  }

  onPointerUp: TLPointerEventHandler = () => {
    // noop important! We don't want the inherited event
    // from BaseUtil to run.
  }

  onPointShape: TLPointerEventHandler = (info) => {
    if (this.app.readOnly) return
    const shape = this.app.getShape(info.target)
    if (shape.type === TDShapeType.Text) {
      this.setStatus(Status.Idle)
      this.app.setEditingId(shape.id)
    }
  }

  onShapeBlur = () => {
    if (this.app.readOnly) return
    this.stopEditingShape()
  }
}
