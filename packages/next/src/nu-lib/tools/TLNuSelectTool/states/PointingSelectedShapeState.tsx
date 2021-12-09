import { Vec } from '@tldraw/vec'
import { TLNuApp, TLNuSelectTool, TLNuToolState, TLNuShape } from '~nu-lib'
import type { TLNuPinchHandler, TLNuPointerHandler, TLNuWheelHandler } from '~types'

export class PointingSelectedShapeState<
  S extends TLNuShape,
  R extends TLNuApp<S>,
  P extends TLNuSelectTool<S, R>
> extends TLNuToolState<S, R, P> {
  static id = 'pointingSelectedShape'

  private pointedSelectedShape?: TLNuShape

  onEnter = (info: { target: TLNuShape }) => {
    this.pointedSelectedShape = info.target
  }

  onExit = () => (this.pointedSelectedShape = undefined)

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
    const { shiftKey } = this.app.inputs

    if (!this.pointedSelectedShape) throw Error('Expected a pointed selected shape')
    if (shiftKey) {
      this.app.deselect(this.pointedSelectedShape.id)
    } else {
      this.app.select(this.pointedSelectedShape.id)
    }
    this.tool.transition('idle')
  }

  onPinchStart: TLNuPinchHandler = (info, gesture, event) => {
    this.tool.transition('pinching', { info, gesture, event })
  }
}
