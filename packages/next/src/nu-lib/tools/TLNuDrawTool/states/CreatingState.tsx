import { Vec } from '@tldraw/vec'
import { PointUtils, uniqueId } from '~utils'
import { TLNuToolState } from '../../../TLNuToolState'
import type { TLNuApp, TLNuDrawShape, TLNuDrawTool } from '~nu-lib'
import type { TLNuBinding, TLNuPointerHandler, TLNuWheelHandler } from '~types'

export class CreatingState<
  S extends TLNuDrawShape,
  R extends TLNuApp,
  P extends TLNuDrawTool<S, R>
> extends TLNuToolState<R, P> {
  static id = 'creating'

  private creatingShape?: S
  private rawPoints: number[][] = [[0, 0, 0.5]]
  private points: number[][] = [[0, 0, 0.5]]
  private offset: number[] = [0, 0, 0.5]

  onEnter = () => {
    const { shapeClass } = this.tool

    const { originPoint } = this.app.inputs

    const shape = new shapeClass({
      id: uniqueId(),
      parentId: this.app.currentPage.id,
      point: originPoint,
      points: [[0, 0, originPoint[2]]],
    })

    this.creatingShape = shape
    this.app.currentPage.addShapes(shape)
    this.app.select(shape)

    this.points = [[0, 0, originPoint[2]]]
    this.rawPoints = [[0, 0, originPoint[2]]]
    this.offset = [0, 0, originPoint[2]]
  }

  onPointerMove: TLNuPointerHandler = () => {
    if (!this.creatingShape) throw Error('Expected a creating shape.')
    const { currentPoint, previousPoint, originPoint } = this.app.inputs
    if (Vec.isEqual(previousPoint, currentPoint)) return

    // The point relative to the initial point
    const point = Vec.sub(currentPoint, originPoint).concat(currentPoint[2])

    // The raw points array holds the relative points
    this.rawPoints.push(point)

    // If the new point is left or above the initial point,
    // update the top left, move the shape so that its page point
    // is at the top left, and move the points so that they appear
    // to stay in the same place.
    if (point[0] < this.offset[0] || point[1] < this.offset[1]) {
      this.offset = [Math.min(this.offset[0], point[0]), Math.min(this.offset[1], point[1])]
      this.points = this.rawPoints.map((point) => Vec.sub(point, this.offset).concat(point[2]))
      this.creatingShape.update({
        point: Vec.add(originPoint, this.offset),
        points: this.points,
      })
    } else {
      this.points.push(Vec.toFixed(Vec.sub(point, this.offset).concat(currentPoint[2])))
      this.creatingShape.update({
        points: this.points,
      })
    }
  }

  onPointerUp: TLNuPointerHandler = () => {
    if (!this.creatingShape) throw Error('Expected a creating shape.')

    this.creatingShape.update({
      isComplete: true,
      points: this.tool.simplify
        ? PointUtils.simplify2(this.points, this.tool.simplifyTolerance)
        : this.creatingShape.points,
    })

    this.tool.transition('idle')
  }

  onWheel: TLNuWheelHandler = (info, gesture, e) => {
    this.onPointerMove(info, e)
  }
}
