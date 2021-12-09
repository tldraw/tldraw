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
  R extends TLNuApp<S>,
  P extends TLNuSelectTool<S, R>
> extends TLNuToolState<S, R, P> {
  static id = 'pointingResizeHandle'

  pointedHandle?: TLNuBoundsHandle

  onEnter = (info: { target: TLNuBoundsHandle }) => {
    this.pointedHandle = info.target
  }

  onWheel: TLNuWheelHandler = (info, gesture, e) => {
    this.onPointerMove(info, e)
  }

  onPointerMove: TLNuPointerHandler = () => {
    const { currentPoint, originPoint } = this.app.inputs
    if (Vec.dist(currentPoint, originPoint) > 5) {
      this.tool.transition('resizingShapes', { handle: this.pointedHandle })
    }
  }

  onPointerUp: TLNuPointerHandler = () => {
    this.tool.transition('idle')
  }

  onPinchStart: TLNuPinchHandler = (info, gesture, event) => {
    this.tool.transition('pinching', { info, gesture, event })
  }
}
