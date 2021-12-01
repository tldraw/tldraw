import { TLNuPointerHandler, TLNuState } from '@tldraw/next'
import Vec from '@tldraw/vec'
import type { Shape } from 'stores'

export class PointingState extends TLNuState<Shape> {
  static id = 'pointing'

  onPointerMove: TLNuPointerHandler<Shape> = () => {
    const { currentPoint, originPoint } = this.app.inputs
    if (Vec.dist(currentPoint, originPoint) > 5) {
      this.tool.transition('creating')
    }
  }
}
