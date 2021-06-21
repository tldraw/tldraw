import CodeShape from './index'
import { uniqueId } from 'utils/utils'
import { LineShape, ShapeType } from 'types'
import { defaultStyle } from 'state/shape-styles'
import Utils from './utils'

export default class Line extends CodeShape<LineShape> {
  constructor(props = {} as Partial<LineShape>) {
    props.point = Utils.vectorToPoint(props.point)
    props.direction = Utils.vectorToPoint(props.direction)

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

  export(): LineShape {
    const shape = { ...this.shape }

    shape.point = Utils.vectorToPoint(shape.point)
    shape.direction = Utils.vectorToPoint(shape.direction)

    return shape
  }

  get direction(): number[] {
    return this.shape.direction
  }
}
