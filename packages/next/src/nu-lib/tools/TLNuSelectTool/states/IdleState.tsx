import { TLNuShape, TLNuState } from '~nu-lib'
import { TLNuBinding, TLNuPointerHandler, TLNuTargetType } from '~types'

export class IdleState<S extends TLNuShape, B extends TLNuBinding> extends TLNuState<S, B> {
  readonly id = 'idle'

  onPointerEnter: TLNuPointerHandler<S> = (info) => {
    if (info.order > 0) return

    if (info.type === TLNuTargetType.Shape) {
      this.app.hoverShape(info.target)
    }
  }

  onPointerDown: TLNuPointerHandler<S> = (info) => {
    if (info.order > 0) return

    switch (info.type) {
      case TLNuTargetType.Shape: {
        if (this.app.selectedShapes.includes(info.target)) {
          this.tool.transition('pointingSelectedShape', info.target)
        } else {
          this.tool.transition('pointingShape', info.target)
        }
        break
      }
      case TLNuTargetType.Bounds: {
        this.tool.transition('pointingBoundsBackground')
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
        this.app.clearHoveredShape()
      }
    }
  }
}
