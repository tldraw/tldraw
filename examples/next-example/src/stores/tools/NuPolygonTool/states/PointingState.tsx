import { TLNuPointerHandler, TLNuState } from '@tldraw/next'
import Vec from '@tldraw/vec'
import type { NuPolygonShape, Shape } from 'stores'

export class PointingState extends TLNuState<NuPolygonShape> {
  static id = 'pointing'

  onPointerMove: TLNuPointerHandler<NuPolygonShape> = () => {
    const { currentPoint, originPoint } = this.app.inputs
    if (Vec.dist(currentPoint, originPoint) > 5) {
      this.tool.transition('creating')
    }
  }
}
