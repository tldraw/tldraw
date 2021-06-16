import CodeShape from './index'
import { uniqueId } from 'utils/utils'
import { LineShape, ShapeType } from 'types'
import { vectorToPoint } from 'utils/utils'
import { defaultStyle } from 'lib/shape-styles'

export default class Line extends CodeShape<LineShape> {
  constructor(props = {} as Partial<LineShape>) {
    props.point = vectorToPoint(props.point)
    props.direction = vectorToPoint(props.direction)

    super({
      id: uniqueId(),
      seed: Math.random(),
      parentId: (window as any).currentPageId,
      type: ShapeType.Line,
      isGenerated: true,
      name: 'Line',
      childIndex: 0,
      point: [0, 0],
      direction: [-0.5, 0.5],
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
