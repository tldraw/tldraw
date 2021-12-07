import { Vec } from '@tldraw/vec'
import { TLNuApp, TLNuDrawShape, TLNuDrawTool, TLNuToolState } from '~nu-lib'
import type { TLNuBinding, TLNuPointerHandler } from '~types'

export class PointingState<
  S extends TLNuDrawShape<any>,
  B extends TLNuBinding,
  R extends TLNuApp<S, B>,
  P extends TLNuDrawTool<S, B, R>
> extends TLNuToolState<S, B, R, P> {
  static id = 'pointing'

  onPointerMove: TLNuPointerHandler<S> = () => {
    const { currentPoint, originPoint } = this.app.inputs
    if (Vec.dist(currentPoint, originPoint) > 5) {
      this.tool.transition('creating')
      this.app.deselectAll()
    }
  }

  onPointerUp: TLNuPointerHandler<S> = () => {
    this.tool.transition('idle')
  }
}
