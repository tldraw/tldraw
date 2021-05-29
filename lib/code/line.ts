import CodeShape from './index'
import { v4 as uuid } from 'uuid'
import { LineShape, ShapeType } from 'types'
import { vectorToPoint } from 'utils/utils'

export default class Line extends CodeShape<LineShape> {
  constructor(props = {} as Partial<LineShape>) {
    props.point = vectorToPoint(props.point)
    props.direction = vectorToPoint(props.direction)

    super({
      id: uuid(),
      type: ShapeType.Line,
      isGenerated: true,
      name: 'Line',
      parentId: 'page0',
      childIndex: 0,
      point: [0, 0],
      direction: [-0.5, 0.5],
      rotation: 0,
      isAspectRatioLocked: false,
      isLocked: false,
      isHidden: false,
      style: {
        fill: '#c6cacb',
        stroke: '#000',
        strokeWidth: 1,
      },
      ...props,
    })
  }

  export() {
    const shape = { ...this.shape }

    shape.point = vectorToPoint(shape.point)
    shape.direction = vectorToPoint(shape.direction)

    return shape
  }

  get direction() {
    return this.shape.direction
  }
}
