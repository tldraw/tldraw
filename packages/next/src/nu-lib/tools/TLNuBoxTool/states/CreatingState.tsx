import { TLNuShape, TLNuState } from '~nu-lib'
import type { TLNuPointerHandler } from '~types'
import { BoundsUtils, uniqueId } from '~utils'
import type { TLNuBoxTool } from '../index'

export class IdleState<S extends TLNuShape> extends TLNuState<S> {
  static id = 'creating'

  creatingShape?: S

  onEnter = () => {
    const { shapeClass } = this.tool as TLNuBoxTool<S>
    const shape = new shapeClass({
      id: uniqueId(),
      parentId: this.app.currentPage.id,
      point: this.app.inputs.currentPoint,
      size: [1, 1],
    })

    this.creatingShape = shape
    this.app.currentPage.addShapes(shape)
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
    if (!this.app.isToolLocked) {
      this.app.selectTool('select')
    }
  }
}
