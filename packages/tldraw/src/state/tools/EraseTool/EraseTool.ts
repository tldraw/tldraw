import Vec from '@tldraw/vec'
import type { TLPointerEventHandler } from '@tldraw/core'
import { SessionType } from '~types'
import { BaseTool } from '../BaseTool'
import { DEAD_ZONE } from '~constants'

enum Status {
  Idle = 'idle',
  Pointing = 'pointing',
  Erasing = 'erasing',
}

export class EraseTool extends BaseTool {
  type = 'erase' as const

  status: Status = Status.Idle

  /* ----------------- Event Handlers ----------------- */

  onPointerDown: TLPointerEventHandler = () => {
    this.setStatus(Status.Pointing)
  }

  onPointerMove: TLPointerEventHandler = (info) => {
    switch (this.status) {
      case Status.Pointing: {
        if (Vec.dist(info.origin, info.point) > DEAD_ZONE) {
          this.app.startSession(SessionType.Erase)
          this.app.updateSession()
          this.setStatus(Status.Erasing)
        }
        break
      }
      case Status.Erasing: {
        this.app.updateSession()
      }
    }
  }

  onPointerUp: TLPointerEventHandler = () => {
    if (this.status === Status.Erasing) {
      this.app.completeSession()

      if (this.previous) {
        this.app.selectTool(this.previous)
      } else {
        this.app.selectTool('select')
      }
    }

    this.setStatus(Status.Idle)
  }

  onCancel = () => {
    if (this.status === Status.Idle) {
      if (this.previous) {
        this.app.selectTool(this.previous)
      } else {
        this.app.selectTool('select')
      }
    } else {
      this.setStatus(Status.Idle)
    }

    this.app.cancelSession()
  }
}
