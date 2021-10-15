import Vec from '@tldraw/vec'
import { Utils, TLPointerEventHandler } from '@tldraw/core'
import { Text } from '~shape/shapes'
import { TLDrawShapeType } from '~types'
import { BaseTool } from '../BaseTool'

enum Status {
  Idle = 'idle',
  Creating = 'creating',
}

export class TextTool extends BaseTool {
  type = TLDrawShapeType.Text

  status = Status.Idle

  /* --------------------- Methods -------------------- */

  onEnter = () => {
    this.setStatus(Status.Idle)
  }

  onExit = () => {
    this.setStatus(Status.Idle)
  }

  stopEditingShape = () => {
    this.setStatus(Status.Idle)

    if (!this.state.appState.isToolLocked) {
      this.state.selectTool('select')
    }
  }

  createTextShapeAtPoint = (point: number[]) => {
    const {
      shapes,
      appState: { currentPageId, currentStyle },
    } = this.state

    const childIndex =
      shapes.length === 0
        ? 1
        : shapes
            .filter((shape) => shape.parentId === currentPageId)
            .sort((a, b) => b.childIndex - a.childIndex)[0].childIndex + 1

    const id = Utils.uniqueId()

    const newShape = Text.create({
      id,
      parentId: currentPageId,
      childIndex,
      point,
      style: { ...currentStyle },
    })

    const bounds = Text.getBounds(newShape)

    newShape.point = Vec.sub(newShape.point, [bounds.width / 2, bounds.height / 2])

    this.state.createShapes(newShape)

    this.state.setEditingId(id)

    this.setStatus(Status.Creating)
  }

  /* ----------------- Event Handlers ----------------- */

  onKeyUp = () => void null

  onKeyDown = () => void null

  onPointerDown: TLPointerEventHandler = (info) => {
    if (this.status === Status.Idle) {
      const pagePoint = Vec.round(this.state.getPagePoint(info.point))
      this.createTextShapeAtPoint(pagePoint)
      return
    }

    if (this.status === Status.Creating) {
      this.stopEditingShape()
    }
  }

  onPointShape: TLPointerEventHandler = (info) => {
    const shape = this.state.getShape(info.target)
    if (shape.type === TLDrawShapeType.Text) {
      this.setStatus(Status.Idle)
      this.state.setEditingId(shape.id)
    }
  }
}
