import { Vec } from '@tldraw/vec'
import { TLNuApp, TLNuDrawShape, TLNuDrawTool, TLNuToolState } from '~nu-lib'
import type { TLNuBinding, TLNuPointerHandler } from '~types'

export class PointingState<
  S extends TLNuDrawShape,
  R extends TLNuApp,
  P extends TLNuDrawTool<S, R>
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
