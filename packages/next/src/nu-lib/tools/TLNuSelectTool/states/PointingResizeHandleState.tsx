import { Vec } from '@tldraw/vec'
import { TLNuShape, TLNuState } from '~nu-lib'
import type { TLNuBinding, TLNuBoundsHandle, TLNuPointerHandler, TLNuWheelHandler } from '~types'

export class PointingResizeHandleState<
  S extends TLNuShape,
  B extends TLNuBinding
> extends TLNuState<S, B> {
  static id = 'pointingResizeHandle'

  pointedHandle?: TLNuBoundsHandle

  onEnter = (info: { target: TLNuBoundsHandle }) => {
    this.pointedHandle = info.target
  }

  onPan: TLNuWheelHandler<S> = (info, e) => {
    this.onPointerMove(info, e)
  }

  onPointerMove: TLNuPointerHandler<S> = () => {
    const { currentPoint, originPoint } = this.app.inputs
    if (Vec.dist(currentPoint, originPoint) > 5) {
      this.tool.transition('resizingShapes', { handle: this.pointedHandle })
    }
  }

  onPointerUp: TLNuPointerHandler<S> = () => {
    this.tool.transition('idle')
  }
}
