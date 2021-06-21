import CodeShape from './index'
import { uniqueId } from 'utils/utils'
import { PolylineShape, ShapeType } from 'types'
import { defaultStyle } from 'state/shape-styles'
import Utils from './utils'

export default class Polyline extends CodeShape<PolylineShape> {
  constructor(props = {} as Partial<PolylineShape>) {
    props.point = Utils.vectorToPoint(props.point)
    props.points = props.points.map(Utils.vectorToPoint)

    super({
      id: uniqueId(),
      seed: Math.random(),
      parentId: (window as any).currentPageId,
      type: ShapeType.Polyline,
      isGenerated: true,
      name: 'Polyline',
      childIndex: 0,
      point: [0, 0],
      points: [[0, 0]],
      rotation: 0,
      isAspectRatioLocked: false,
      isLocked: false,
      isHidden: false,
      style: defaultStyle,
      ...props,
    })
  }

  export(): PolylineShape {
    const shape = { ...this.shape }

    shape.point = Utils.vectorToPoint(shape.point)
    shape.points = shape.points.map(Utils.vectorToPoint)

    return shape
  }

  get points(): number[][] {
    return this.shape.points
  }
}
