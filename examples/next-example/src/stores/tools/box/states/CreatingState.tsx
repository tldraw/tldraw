import { BoundsUtils, TLNuPointerHandler, TLNuState, uniqueId } from '@tldraw/next'
import { NuBoxShape, Shape } from 'stores'

export class IdleState extends TLNuState<Shape> {
  static id = 'creating'

  creatingShape?: Shape

  onEnter = () => {
    const shape = new NuBoxShape({
      id: uniqueId(),
      parentId: this.app.currentPage.id,
      point: this.app.inputs.currentPoint,
      size: [1, 1],
    })

    this.creatingShape = shape
    this.app.currentPage.addShapes(shape)
  }

  onPointerMove: TLNuPointerHandler<Shape> = () => {
    if (!this.creatingShape) throw Error('Expected a creating shape.')
    const { currentPoint, originPoint } = this.app.inputs
    const bounds = BoundsUtils.getBoundsFromPoints([currentPoint, originPoint])
    this.creatingShape.update({
      point: [bounds.minX, bounds.minY],
      size: [bounds.width, bounds.height],
    })
  }

  onPointerUp: TLNuPointerHandler<Shape> = () => {
    this.tool.transition('idle')
    if (!this.app.isToolLocked) {
      this.app.selectTool('select')
    }
  }
}
