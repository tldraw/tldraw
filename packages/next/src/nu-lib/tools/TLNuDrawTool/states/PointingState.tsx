import { Vec } from '@tldraw/vec'
import { TLNuApp, TLNuShape, TLNuDrawShape, TLNuDrawTool, TLNuToolState } from '~nu-lib'
import type { TLNuBinding, TLNuPointerHandler } from '~types'

export class PointingState<
  S extends TLNuShape,
  T extends S & TLNuDrawShape,
  R extends TLNuApp<S>,
  P extends TLNuDrawTool<T, S, R>
> extends TLNuToolState<R, P> {
  static id = 'pointing'

  onPointerMove: TLNuPointerHandler = () => {
    const { currentPoint, originPoint } = this.app.inputs
    if (Vec.dist(currentPoint, originPoint) > 5) {
      this.tool.transition('creating')
      this.app.deselectAll()
    }
  }

  onPointerUp: TLNuPointerHandler = () => {
    this.tool.transition('idle')
  }
}
