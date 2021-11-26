import type { TLPointerEventHandler, TLKeyboardEventHandler } from '@tldraw/core'
import Vec from '@tldraw/vec'
import { TDShapeType } from '~types'
import { BaseTool, Status } from '../BaseTool'

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

      this.app.createTextShapeAtPoint(showGrid ? Vec.snap(currentPoint, currentGrid) : currentPoint)
      this.setStatus(Status.Creating)
      return
    }
  }

  onPointerUp: TLPointerEventHandler = () => {
    // noop important! We don't want the inherited event
    // from BaseUtil to run.
  }

  onPointShape: TLPointerEventHandler = (info) => {
    const shape = this.app.getShape(info.target)
    if (shape.type === TDShapeType.Text) {
      this.setStatus(Status.Idle)
      this.app.setEditingId(shape.id)
    }
  }

  onShapeBlur = () => {
    this.stopEditingShape()
  }
}
