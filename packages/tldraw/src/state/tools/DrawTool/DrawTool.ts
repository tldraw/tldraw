import { Utils, TLPointerEventHandler, TLKeyboardEventHandler } from '@tldraw/core'
import { Draw } from '~state/shapes'
import { SessionType, TDShapeType } from '~types'
import Vec from '@tldraw/vec'
import { BaseTool } from '../BaseTool'

enum Status {
  Idle = 'idle',
  Creating = 'creating',
  Extending = 'extending',
  Pinching = 'pinching',
  MiddleWheelPanning = 'middleWheelPanning',
  SpacePanning = 'spacePanning',
}

export class DrawTool extends BaseTool {
  type = TDShapeType.Draw as const

  private lastShapeId?: string

  onEnter = () => {
    this.lastShapeId = undefined
  }

  onCancel = () => {
    switch (this.status) {
      case Status.Idle: {
        this.app.selectTool('select')
        break
      }
      default: {
        this.setStatus(Status.Idle)
        break
      }
    }

    this.app.cancelSession()
  }

  /* ----------------- Event Handlers ----------------- */

  onPointerDown: TLPointerEventHandler = (info, e) => {
    if (e.buttons === 4) {
      this.setStatus(Status.MiddleWheelPanning)
      return
    }

    if (this.status !== Status.Idle) return
    const {
      currentPoint,
      appState: { currentPageId, currentStyle },
    } = this.app
    if (info.shiftKey && this.lastShapeId) {
      // Extend the previous shape
      this.app.startSession(SessionType.Draw, this.lastShapeId)
      this.setStatus(Status.Extending)
    } else {
      // Create a new shape
      const childIndex = this.getNextChildIndex()
      const id = Utils.uniqueId()
      const newShape = Draw.create({
        id,
        parentId: currentPageId,
        childIndex,
        point: currentPoint,
        style: { ...currentStyle },
      })
      this.lastShapeId = id
      this.app.patchCreate([newShape])
      this.app.startSession(SessionType.Draw, id)
      this.setStatus(Status.Creating)
    }
  }

  onPointerMove: TLPointerEventHandler = (info, e) => {
    if (
      (this.status === Status.SpacePanning && e.buttons === 1) ||
      (this.status === Status.MiddleWheelPanning && e.buttons === 4)
    ) {
      this.app.onPan?.({ ...info, delta: Vec.neg(info.delta) }, e as unknown as WheelEvent)
      return
    }

    switch (this.status) {
      case Status.Extending:
      case Status.Creating: {
        this.app.updateSession()
      }
    }
  }

  onPointerUp: TLPointerEventHandler = () => {
    if (this.status === Status.MiddleWheelPanning) {
      this.setStatus(Status.Idle)
      return
    }
    this.app.completeSession()
    this.setStatus(Status.Idle)
  }

  onKeyDown: TLKeyboardEventHandler = (key) => {
    switch (key) {
      case 'Escape': {
        this.onCancel()
        break
      }
      case ' ': {
        if (this.status === Status.Idle) {
          this.setStatus(Status.SpacePanning)
        }
        break
      }
    }
  }

  onKeyUp: TLKeyboardEventHandler = (key) => {
    if (this.status === Status.SpacePanning && key === ' ') {
      this.setStatus(Status.Idle)
      return
    }
  }
}
