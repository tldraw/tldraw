import CodeShape from './index'
import { uniqueId } from 'utils/utils'
import { LineShape, ShapeStyles, ShapeType } from 'types'
import { defaultStyle } from 'state/shape-styles'

/**
 * ## Line
 */
export default class Line extends CodeShape<LineShape> {
  constructor(props = {} as Partial<LineShape> & Partial<ShapeStyles>) {
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

  get direction(): number[] {
    return this.shape.direction
  }
}
