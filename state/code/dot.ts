import CodeShape from './index'
import { uniqueId } from 'utils/utils'
import { DotShape, ShapeType } from 'types'
import { defaultStyle } from 'state/shape-styles'
import Utils from './utils'

export default class Dot extends CodeShape<DotShape> {
  constructor(props = {} as Partial<DotShape>) {
    props.point = Utils.vectorToPoint(props.point)

    super({
      id: uniqueId(),
      seed: Math.random(),
      parentId: (window as any).currentPageId,
      type: ShapeType.Dot,
      isGenerated: true,
      name: 'Dot',
      childIndex: 0,
      point: [0, 0],
      rotation: 0,
      isAspectRatioLocked: false,
      isLocked: false,
      isHidden: false,
      ...props,
      style: {
        ...defaultStyle,
        ...props.style,
        isFilled: true,
      },
    })
  }

  export(): DotShape {
    const shape = { ...this.shape }

    shape.point = Utils.vectorToPoint(shape.point)

    return shape
  }
}
