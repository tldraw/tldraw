import { Vec } from '@tldraw/vec'
import { TLNuShape, TLNuState } from '~nu-lib'
import type { TLNuBinding, TLNuPointerHandler, TLNuWheelHandler } from '~types'

export class PointingSelectedShapeState<
  S extends TLNuShape,
  B extends TLNuBinding
> extends TLNuState<S, B> {
  readonly id = 'pointingSelectedShape'

  private pointedSelectedShape?: S

  onEnter = (info: { target: S }) => {
    this.pointedSelectedShape = info.target
  }

  onExit = () => (this.pointedSelectedShape = undefined)

  onPan: TLNuWheelHandler<S> = (info, e) => {
    this.onPointerMove(info, e)
  }

  onPointerMove: TLNuPointerHandler<S> = () => {
    const { currentPoint, originPoint } = this.app.inputs
    if (Vec.dist(currentPoint, originPoint) > 5) {
      this.tool.transition('translatingShapes')
    }
  }

  onPointerUp: TLNuPointerHandler<S> = () => {
    if (!this.pointedSelectedShape) throw Error('Expected a pointed selected shape')
    this.app.select(this.pointedSelectedShape.id)
    this.tool.transition('idle')
  }
}
