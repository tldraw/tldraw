import { TLNuShape, TLNuState } from '~nu-lib'
import { TLNuBinding, TLNuPointerHandler, TLNuTargetType } from '~types'

export class IdleState<S extends TLNuShape, B extends TLNuBinding> extends TLNuState<S, B> {
  readonly id = 'idle'

  onPointerEnter: TLNuPointerHandler<S> = (info) => {
    if (info.order > 0) return

    if (info.type === TLNuTargetType.Shape) {
      this.app.hover(info.target.id)
    }
  }

  onPointerDown: TLNuPointerHandler<S> = (info) => {
    if (info.order > 0) return

    const { ctrlKey } = this.app.inputs

    if (ctrlKey) {
      this.tool.transition('pointingCanvas')
      return
    }

    switch (info.type) {
      case TLNuTargetType.Shape: {
        if (this.app.selectedShapes.includes(info.target)) {
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
}
