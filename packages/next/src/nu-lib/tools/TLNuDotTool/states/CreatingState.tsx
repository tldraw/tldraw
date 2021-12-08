import type { TLNuApp, TLNuDotShape, TLNuDotTool } from '~nu-lib'
import { TLNuToolState } from '../../../TLNuToolState'
import type { TLNuBinding, TLNuPointerHandler, TLNuWheelHandler } from '~types'
import { BoundsUtils, uniqueId } from '~utils'

export class CreatingState<
  S extends TLNuDotShape<any>,
  B extends TLNuBinding,
  R extends TLNuApp<S, B>,
  P extends TLNuDotTool<S, B, R>
> extends TLNuToolState<S, B, R, P> {
  static id = 'creating'

  creatingShape?: S

  onEnter = () => {
    const { shapeClass } = this.tool
    const shape = new shapeClass(this.app, {
      id: uniqueId(),
      parentId: this.app.currentPage.id,
      point: this.app.inputs.currentPoint,
    })

    this.creatingShape = shape
    this.app.currentPage.addShapes(shape)
    this.app.select(shape)
  }

  onPointerMove: TLNuPointerHandler<S> = () => {
    if (!this.creatingShape) throw Error('Expected a creating shape.')
    const { currentPoint } = this.app.inputs
    this.creatingShape.update({
      point: currentPoint,
    })
  }

  onPointerUp: TLNuPointerHandler<S> = () => {
    this.tool.transition('idle')
    if (this.creatingShape) {
      this.app.select(this.creatingShape)
    }
    if (!this.app.isToolLocked) {
      this.app.transition('select')
    }
  }

  onWheel: TLNuWheelHandler<S> = (info, gesture, e) => {
    this.onPointerMove(info, e)
  }
}
