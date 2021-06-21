import CodeShape from './index'
import { uniqueId } from 'utils/utils'
import { CircleShape, ShapeType } from 'types'
import Utils from './utils'
import { defaultStyle } from 'state/shape-styles'

export default class Circle extends CodeShape<CircleShape> {
  constructor(props = {} as Partial<CircleShape>) {
    props.point = Utils.vectorToPoint(props.point)

    super({
      id: uniqueId(),
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

  export(): CircleShape {
    const shape = { ...this.shape }

    shape.point = Utils.vectorToPoint(shape.point)

    return shape
  }

  get radius(): number {
    return this.shape.radius
  }
}
