import CodeShape from './index'
import { v4 as uuid } from 'uuid'
import { RectangleShape, ShapeType } from 'types'
import { vectorToPoint } from 'utils/utils'
import { defaultStyle } from 'lib/shape-styles'

export default class Rectangle extends CodeShape<RectangleShape> {
  constructor(props = {} as Partial<RectangleShape>) {
    props.point = vectorToPoint(props.point)
    props.size = vectorToPoint(props.size)

    super({
      id: uuid(),
      seed: Math.random(),
      type: ShapeType.Rectangle,
      isGenerated: true,
      name: 'Rectangle',
      parentId: 'page0',
      childIndex: 0,
      point: [0, 0],
      size: [100, 100],
      rotation: 0,
      radius: 2,
      isAspectRatioLocked: false,
      isLocked: false,
      isHidden: false,
      style: defaultStyle,
      ...props,
    })
  }

  get size() {
    return this.shape.size
  }
}
