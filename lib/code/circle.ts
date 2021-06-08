import CodeShape from './index'
import { v4 as uuid } from 'uuid'
import { CircleShape, ShapeType } from 'types'
import { vectorToPoint } from 'utils/utils'
import { defaultStyle } from 'lib/shape-styles'

export default class Circle extends CodeShape<CircleShape> {
  constructor(props = {} as Partial<CircleShape>) {
    props.point = vectorToPoint(props.point)

    super({
      id: uuid(),
      seed: Math.random(),
      parentId: (window as any).currentPageId,
      type: ShapeType.Circle,
      isGenerated: true,
      name: 'Circle',
      childIndex: 0,
      point: [0, 0],
      rotation: 0,
      radius: 20,
      isAspectRatioLocked: false,
      isLocked: false,
      isHidden: false,
      ...props,
      style: { ...defaultStyle, ...props.style },
    })
  }

  export() {
    const shape = { ...this.shape }

    shape.point = vectorToPoint(shape.point)

    return shape
  }

  get radius() {
    return this.shape.radius
  }
}
