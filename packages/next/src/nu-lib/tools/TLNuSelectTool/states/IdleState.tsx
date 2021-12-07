import { TLNuApp, TLNuSelectTool, TLNuShape, TLNuToolState } from '~nu-lib'
import {
  TLNuBinding,
  TLNuPinchHandler,
  TLNuPointerHandler,
  TLNuShortcut,
  TLNuTargetType,
} from '~types'

export class IdleState<
  S extends TLNuShape,
  B extends TLNuBinding,
  R extends TLNuApp<S, B>,
  P extends TLNuSelectTool<S, B, R>
> extends TLNuToolState<S, B, R, P> {
  static id = 'idle'

  shortcuts: TLNuShortcut[] = [
    {
      keys: 'Delete,Backspace',
      fn: () => this.app.delete(),
    },
    {
      keys: 'cmd+a,ctrl+a',
      fn: () => this.app.selectAll(),
    },
  ]

  onExit = () => {
    this.app.hover(undefined)
  }

  onPointerEnter: TLNuPointerHandler<S> = (info) => {
    if (info.order > 0) return

    if (info.type === TLNuTargetType.Shape) {
      this.app.hover(info.target.id)
    }
  }

  onPointerDown: TLNuPointerHandler<S> = (info) => {
    if (info.order > 0) return

    const {
      selectedShapes,
      inputs: { ctrlKey },
    } = this.app

    // Holding ctrlKey should ignore shapes
    if (ctrlKey) {
      this.tool.transition('pointingCanvas')
      return
    }

    switch (info.type) {
      case TLNuTargetType.Shape: {
        if (selectedShapes.includes(info.target)) {
          this.tool.transition('pointingSelectedShape', { target: info.target })
        } else {
          this.tool.transition('pointingShape', { target: info.target })
        }
        break
      }
      case TLNuTargetType.Bounds: {
        switch (info.target) {
          case 'center':
          case 'background': {
            this.tool.transition('pointingBoundsBackground')
            break
          }
          case 'rotate': {
            this.tool.transition('pointingRotateHandle')
            break
          }
          default: {
            this.tool.transition('pointingResizeHandle', { target: info.target })
          }
        }
        break
      }
      case TLNuTargetType.Canvas: {
        this.tool.transition('pointingCanvas')
        break
      }
    }
  }

  onPointerLeave: TLNuPointerHandler<S> = (info) => {
    if (info.order > 0) return

    if (info.type === TLNuTargetType.Shape) {
      if (this.app.hoveredId) {
        this.app.hover(undefined)
      }
    }
  }

  onPinchStart: TLNuPinchHandler<S> = (info, gesture, event) => {
    this.tool.transition('pinching', { info, gesture, event })
  }
}
