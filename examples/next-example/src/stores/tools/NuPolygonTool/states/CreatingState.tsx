import { BoundsUtils, TLNuPointerHandler, TLNuState, uniqueId } from '@tldraw/next'
import { NuBoxShape, NuPolygonShape, Shape } from 'stores'

export class IdleState extends TLNuState<NuPolygonShape> {
  static id = 'creating'

  creatingShape?: NuPolygonShape

  onEnter = () => {
    const shape = new NuPolygonShape({
      id: uniqueId(),
      parentId: this.app.currentPage.id,
      point: this.app.inputs.currentPoint,
      size: [1, 1],
      sides: 3,
    })

    this.creatingShape = shape
    this.app.currentPage.addShapes(shape)
  }

  onPointerMove: TLNuPointerHandler<NuPolygonShape> = () => {
    if (!this.creatingShape) throw Error('Expected a creating shape.')
    const { currentPoint, originPoint } = this.app.inputs
    const bounds = BoundsUtils.getBoundsFromPoints([currentPoint, originPoint])
    this.creatingShape.update({
      point: [bounds.minX, bounds.minY],
      size: [bounds.width, bounds.height],
    })
  }

  onPointerUp: TLNuPointerHandler<NuPolygonShape> = () => {
    this.tool.transition('idle')
    if (!this.app.isToolLocked) {
      this.app.selectTool('select')
    }
  }
}
