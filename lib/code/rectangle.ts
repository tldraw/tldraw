import CodeShape from './index'
import { uniqueId } from 'utils/utils'
import { RectangleShape, ShapeType } from 'types'
import { vectorToPoint } from 'utils/utils'
import { defaultStyle } from 'lib/shape-styles'

export default class Rectangle extends CodeShape<RectangleShape> {
  constructor(props = {} as Partial<RectangleShape>) {
    props.point = vectorToPoint(props.point)
    props.size = vectorToPoint(props.size)

    super({
      id: uniqueId(),
      seed: Math.random(),
      parentId: (window as any).currentPageId,
      type: ShapeType.Rectangle,
      isGenerated: true,
      name: 'Rectangle',
      childIndex: 0,
      point: [0, 0],
      size: [100, 100],
      rotation: 0,
      radius: 2,
      isAspectRatioLocked: false,
      isLocked: false,
      isHidden: false,
      ...props,
      style: { ...defaultStyle, ...props.style },
    })
  }

  get size() {
    return this.shape.size
  }
}
