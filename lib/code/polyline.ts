import CodeShape from './index'
import { v4 as uuid } from 'uuid'
import { PolylineShape, ShapeType } from 'types'
import { vectorToPoint } from 'utils/utils'
import { defaultStyle } from 'lib/shape-styles'

export default class Polyline extends CodeShape<PolylineShape> {
  constructor(props = {} as Partial<PolylineShape>) {
    props.point = vectorToPoint(props.point)
    props.points = props.points.map(vectorToPoint)

    super({
      id: uuid(),
      seed: Math.random(),
      type: ShapeType.Polyline,
      isGenerated: true,
      name: 'Polyline',
      parentId: 'page0',
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

  export() {
    const shape = { ...this.shape }

    shape.point = vectorToPoint(shape.point)
    shape.points = shape.points.map(vectorToPoint)

    return shape
  }

  get points() {
    return this.shape.points
  }
}
