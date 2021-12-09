import { TLNuShape, TLNuBoxTool, TLNuToolState, TLNuApp, TLNuBoxShape } from '~nu-lib'
import type { TLNuPointerHandler, TLNuWheelHandler } from '~types'
import { BoundsUtils, uniqueId } from '~utils'

export class CreatingState<
  S extends TLNuShape,
  T extends S & TLNuBoxShape,
  R extends TLNuApp<S>,
  P extends TLNuBoxTool<T, S, R>
> extends TLNuToolState<R, P> {
  static id = 'creating'

  creatingShape?: S

  onEnter = () => {
    const { shapeClass } = this.tool
    const shape = new shapeClass({
      id: uniqueId(),
      parentId: this.app.currentPage.id,
      point: this.app.inputs.currentPoint,
      size: [1, 1],
    })

    this.creatingShape = shape
    this.app.currentPage.addShapes(shape)
    this.app.select(shape)
  }

  onPointerMove: TLNuPointerHandler = () => {
    if (!this.creatingShape) throw Error('Expected a creating shape.')
    const { currentPoint, originPoint } = this.app.inputs
    const bounds = BoundsUtils.getBoundsFromPoints([currentPoint, originPoint])
    this.creatingShape.update({
      point: [bounds.minX, bounds.minY],
      size: [bounds.width, bounds.height],
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
