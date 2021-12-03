import { Vec } from '@tldraw/vec'
import { TLNuShape, TLNuState } from '~nu-lib'
import type { TLNuBinding, TLNuPointerHandler, TLNuWheelHandler } from '~types'

export class PointingRotateHandleState<
  S extends TLNuShape,
  B extends TLNuBinding
> extends TLNuState<S, B> {
  static id = 'pointingRotateHandle'

  onWheel: TLNuWheelHandler<S> = (info, gesture, e) => {
    this.onPointerMove(info, e)
  }

  onPointerMove: TLNuPointerHandler<S> = () => {
    const { currentPoint, originPoint } = this.app.inputs
    if (Vec.dist(currentPoint, originPoint) > 5) {
      this.tool.transition('rotatingShapes')
    }
  }

  onPointerUp: TLNuPointerHandler<S> = () => {
    this.tool.transition('idle')
  }
}
