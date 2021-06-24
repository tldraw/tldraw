import CodeShape from './index'
import { uniqueId } from 'utils'
import { RectangleShape, ShapeProps, ShapeType } from 'types'
import { defaultStyle } from 'state/shape-styles'

/**
 * ## Rectangle
 */
export default class Rectangle extends CodeShape<RectangleShape> {
  constructor(props = {} as ShapeProps<RectangleShape>) {
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

  get size(): number[] {
    return this.shape.size
  }
}
