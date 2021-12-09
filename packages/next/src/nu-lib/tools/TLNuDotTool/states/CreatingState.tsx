import type { TLNuApp, TLNuDotShape, TLNuShape, TLNuDotTool } from '~nu-lib'
import { TLNuToolState } from '../../../TLNuToolState'
import type { TLNuPointerHandler, TLNuWheelHandler } from '~types'
import { uniqueId } from '~utils'

export class CreatingState<
  S extends TLNuShape,
  T extends S & TLNuDotShape,
  R extends TLNuApp<S>,
  P extends TLNuDotTool<T, S, R>
> extends TLNuToolState<R, P> {
  static id = 'creating'

  creatingShape?: S

  onEnter = () => {
    const { shapeClass } = this.tool
    const shape = new shapeClass({
      id: uniqueId(),
      parentId: this.app.currentPage.id,
      point: this.app.inputs.currentPoint,
    })

    this.creatingShape = shape
    this.app.currentPage.addShapes(shape)
    this.app.select(shape)
  }

  onPointerMove: TLNuPointerHandler = () => {
    if (!this.creatingShape) throw Error('Expected a creating shape.')
    const { currentPoint } = this.app.inputs
    this.creatingShape.update({
      point: currentPoint,
    })
  }

  onPointerUp: TLNuPointerHandler = () => {
    this.tool.transition('idle')
    if (this.creatingShape) {
      this.app.select(this.creatingShape)
    }
    if (!this.app.isToolLocked) {
      this.app.transition('select')
    }
  }

  onWheel: TLNuWheelHandler = (info, gesture, e) => {
    this.onPointerMove(info, e)
  }
}
