import { TLNuDrawShape, TLNuShapeClass, TLNuState } from '~nu-lib'
import { uniqueId } from '~utils'
import type { TLNuPointerHandler } from '~types'
import type { TLNuDrawTool } from '../index'
import Vec from '@tldraw/vec'

export class CreatingState<S extends TLNuDrawShape<any>> extends TLNuState<S> {
  static id = 'creating'

  private creatingShape?: S

  onEnter = () => {
    const { shapeClass } = this.tool as TLNuDrawTool<S>
    const shape = new shapeClass({
      id: uniqueId(),
      parentId: this.app.currentPage.id,
      point: this.app.inputs.currentPoint,
      points: [[0, 0]],
    })

    this.creatingShape = shape
    this.app.currentPage.addShapes(shape)
    this.app.select(shape)
  }

  onPointerMove: TLNuPointerHandler<S> = () => {
    if (!this.creatingShape) throw Error('Expected a creating shape.')
    const { currentPoint, originPoint } = this.app.inputs
    const { points } = this.creatingShape
    this.creatingShape.update({
      points: [...points, Vec.sub(currentPoint, originPoint)],
    })
  }

  onPointerUp: TLNuPointerHandler<S> = () => {
    this.tool.transition('idle')
    if (this.creatingShape) {
      this.app.select(this.creatingShape)
    }
    if (!this.app.isToolLocked) {
      this.app.selectTool('select')
    }
  }
}
