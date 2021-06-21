import CodeShape from './index'
import { uniqueId } from 'utils/utils'
import { RayShape, ShapeType } from 'types'
import { defaultStyle } from 'state/shape-styles'
import Utils from './utils'

export default class Ray extends CodeShape<RayShape> {
  constructor(props = {} as Partial<RayShape>) {
    props.point = Utils.vectorToPoint(props.point)
    props.direction = Utils.vectorToPoint(props.direction)

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

  export(): RayShape {
    const shape = { ...this.shape }

    shape.point = Utils.vectorToPoint(shape.point)
    shape.direction = Utils.vectorToPoint(shape.direction)

    return shape
  }

  get direction(): number[] {
    return this.shape.direction
  }
}
