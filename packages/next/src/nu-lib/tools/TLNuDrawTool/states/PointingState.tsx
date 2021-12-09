import { Vec } from '@tldraw/vec'
import { PI2 } from '~constants'
import { TLNuApp, TLNuShape, TLNuDrawShape, TLNuDrawTool, TLNuToolState } from '~nu-lib'
import type { TLNuBinding, TLNuPointerHandler } from '~types'
import { uniqueId } from '~utils'

export class PointingState<
  S extends TLNuShape,
  T extends S & TLNuDrawShape,
  R extends TLNuApp<S>,
  P extends TLNuDrawTool<T, S, R>
> extends TLNuToolState<S, R, P> {
  static id = 'pointing'

  onPointerMove: TLNuPointerHandler = () => {
    const { currentPoint, originPoint } = this.app.inputs
    if (Vec.dist(currentPoint, originPoint) > 5) {
      this.tool.transition('creating')
      this.app.deselectAll()
    }
  }

  onPointerUp: TLNuPointerHandler = () => {
    const { shapeClass } = this.tool

    const { originPoint } = this.app.inputs

    const shape = new shapeClass({
      id: uniqueId(),
      parentId: this.app.currentPage.id,
      point: originPoint,
      points: [[0, 0, 0.5]],
    })

    this.app.currentPage.addShapes(shape)

    this.tool.transition('idle')
  }
}
