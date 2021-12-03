import { Vec } from '@tldraw/vec'
import { TLNuShape, TLNuState } from '~nu-lib'
import type { TLNuBinding, TLNuPinchHandler, TLNuPointerHandler, TLNuWheelHandler } from '~types'

export class PointingCanvasState<S extends TLNuShape, B extends TLNuBinding> extends TLNuState<
  S,
  B
> {
  static id = 'pointingCanvas'

  onEnter = () => {
    const { shiftKey } = this.app.inputs
    if (!shiftKey) this.app.deselectAll()
  }

  onWheel: TLNuWheelHandler<S> = (info, gesture, e) => {
    this.onPointerMove(info, e)
  }

  onPointerMove: TLNuPointerHandler<S> = () => {
    const { currentPoint, originPoint } = this.app.inputs
    if (Vec.dist(currentPoint, originPoint) > 5) {
      this.tool.transition('brushing')
    }
  }

  onPointerUp: TLNuPointerHandler<S> = () => {
    this.app.deselectAll()
    this.tool.transition('idle')
  }

  onPinchStart: TLNuPinchHandler<S> = (info, gesture, event) => {
    this.tool.transition('pinching', { info, gesture, event })
  }
}
