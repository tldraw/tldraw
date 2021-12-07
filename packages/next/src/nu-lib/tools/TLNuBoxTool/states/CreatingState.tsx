import type { TLNuApp, TLNuBoxShape, TLNuBoxTool } from '~nu-lib'
import { TLNuToolState } from '../../../TLNuToolState'
import type { TLNuBinding, TLNuPointerHandler, TLNuWheelHandler } from '~types'
import { BoundsUtils, uniqueId } from '~utils'

export class CreatingState<
  S extends TLNuBoxShape<any>,
  B extends TLNuBinding,
  R extends TLNuApp<S, B>,
  P extends TLNuBoxTool<S, B, R>
> extends TLNuToolState<S, B, R, P> {
  static id = 'creating'

  creatingShape?: S

  onEnter = () => {
    const { shapeClass } = this.tool
    const shape = new shapeClass(this.app, {
      id: uniqueId(),
      parentId: this.app.currentPage.id,
      point: this.app.inputs.currentPoint,
      size: [1, 1],
    })

    this.creatingShape = shape
    this.app.currentPage.addShapes(shape)
    this.app.select(shape)
  }

  onPointerMove: TLNuPointerHandler<S> = () => {
    if (!this.creatingShape) throw Error('Expected a creating shape.')
    const { currentPoint, originPoint } = this.app.inputs
    const bounds = BoundsUtils.getBoundsFromPoints([currentPoint, originPoint])
    this.creatingShape.update({
      point: [bounds.minX, bounds.minY],
      size: [bounds.width, bounds.height],
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
