import CodeShape from './index'
import { uniqueId } from 'utils/utils'
import { RayShape, ShapeType } from 'types'
import { vectorToPoint } from 'utils/utils'
import { defaultStyle } from 'lib/shape-styles'

export default class Ray extends CodeShape<RayShape> {
  constructor(props = {} as Partial<RayShape>) {
    props.point = vectorToPoint(props.point)
    props.direction = vectorToPoint(props.direction)

    super({
      id: uniqueId(),
      seed: Math.random(),
      type: ShapeType.Ray,
      isGenerated: true,
      name: 'Ray',
      parentId: 'page1',
      childIndex: 0,
      point: [0, 0],
      direction: [0, 1],
      rotation: 0,
      isAspectRatioLocked: false,
      isLocked: false,
      isHidden: false,
      ...props,
      style: {
        ...defaultStyle,
        ...props.style,
        isFilled: false,
      },
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
