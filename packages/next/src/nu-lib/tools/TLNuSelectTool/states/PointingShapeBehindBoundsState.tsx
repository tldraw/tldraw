import { Vec } from '@tldraw/vec'
import { TLNuApp, TLNuShape, TLNuSelectTool, TLNuToolState } from '~nu-lib'
import type { TLNuPinchHandler, TLNuPointerHandler, TLNuWheelHandler } from '~types'

export class PointingShapeBehindBoundsState<
  S extends TLNuShape,
  R extends TLNuApp<S>,
  P extends TLNuSelectTool<S, R>
> extends TLNuToolState<S, R, P> {
  static id = 'pointingShapeBehindBounds'

  info = {} as { target: TLNuShape }

  onEnter = (info: { target: TLNuShape }) => {
    this.info = info
  }

  onWheel: TLNuWheelHandler = (info, gesture, e) => {
    this.onPointerMove(info, e)
  }

  onPointerMove: TLNuPointerHandler = () => {
    const { currentPoint, originPoint } = this.app.inputs
    if (Vec.dist(currentPoint, originPoint) > 5) {
      this.tool.transition('translatingShapes')
    }
  }

  onPointerUp: TLNuPointerHandler = () => {
    const {
      selectedIds,
      inputs: { shiftKey },
    } = this.app

    if (shiftKey) {
      this.app.select(...selectedIds, this.info.target.id)
    } else {
      this.app.select(this.info.target.id)
    }

    this.tool.transition('idle')
  }

  onPinchStart: TLNuPinchHandler = (info, gesture, event) => {
    this.tool.transition('pinching', { info, gesture, event })
  }
}
