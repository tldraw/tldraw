import Vec from '@tldraw/vec'
import type { TLPointerEventHandler } from '@tldraw/core'
import { SessionType } from '~types'
import { BaseTool } from '../BaseTool'

enum Status {
  Idle = 'idle',
  Erasing = 'erasing',
}

export class EraseTool extends BaseTool {
  type = 'erase' as const

  status: Status = Status.Idle

  /* ----------------- Event Handlers ----------------- */

  onPointerDown: TLPointerEventHandler = (info) => {
    const pagePoint = Vec.round(this.state.getPagePoint(info.point))

    this.state.startSession(SessionType.Erase, pagePoint)

    this.setStatus(Status.Erasing)
  }

  onPointerMove: TLPointerEventHandler = (info) => {
    if (this.status === Status.Erasing) {
      const pagePoint = Vec.round(this.state.getPagePoint(info.point))
      this.state.updateSession(
        [...pagePoint, info.pressure || 0.5],
        info.shiftKey,
        info.altKey,
        info.metaKey
      )
    }
  }

  onPointerUp: TLPointerEventHandler = () => {
    if (this.status === Status.Erasing) {
      this.state.completeSession()

      if (this.previous) {
        this.state.selectTool(this.previous)
      } else {
        this.state.selectTool('select')
      }
    }

    this.setStatus(Status.Idle)
  }

  onCancel = () => {
    if (this.status === Status.Idle) {
      if (this.previous) {
        this.state.selectTool(this.previous)
      } else {
        this.state.selectTool('select')
      }
    } else {
      this.setStatus(Status.Idle)
    }

    this.state.cancelSession()
  }
}
