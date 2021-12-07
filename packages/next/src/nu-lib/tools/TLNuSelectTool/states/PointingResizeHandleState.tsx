import { Vec } from '@tldraw/vec'
import { TLNuApp, TLNuSelectTool, TLNuShape, TLNuToolState } from '~nu-lib'
import type {
  TLNuBinding,
  TLNuBoundsHandle,
  TLNuPinchHandler,
  TLNuPointerHandler,
  TLNuWheelHandler,
} from '~types'

export class PointingResizeHandleState<
  S extends TLNuShape,
  B extends TLNuBinding,
  R extends TLNuApp<S, B>,
  P extends TLNuSelectTool<S, B, R>
> extends TLNuToolState<S, B, R, P> {
  static id = 'pointingResizeHandle'

  pointedHandle?: TLNuBoundsHandle

  onEnter = (info: { target: TLNuBoundsHandle }) => {
    this.pointedHandle = info.target
  }

  onWheel: TLNuWheelHandler<S> = (info, gesture, e) => {
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

  onPinchStart: TLNuPinchHandler<S> = (info, gesture, event) => {
    this.tool.transition('pinching', { info, gesture, event })
  }
}
