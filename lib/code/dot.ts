import CodeShape from './index'
import { v4 as uuid } from 'uuid'
import { DotShape, ShapeType } from 'types'
import { vectorToPoint } from 'utils/utils'

export default class Dot extends CodeShape<DotShape> {
  constructor(props = {} as Partial<DotShape>) {
    props.point = vectorToPoint(props.point)

    super({
      id: uuid(),
      type: ShapeType.Dot,
      isGenerated: true,
      name: 'Dot',
      parentId: 'page0',
      childIndex: 0,
      point: [0, 0],
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

    return shape
  }
}
