import CodeShape from './index'
import { uniqueId } from 'utils/utils'
import { LineShape, ShapeProps, ShapeType } from 'types'
import { defaultStyle } from 'state/shape-styles'

/* ----------------- Start Copy Here ---------------- */

export default class Line extends CodeShape<LineShape> {
  constructor(props = {} as ShapeProps<LineShape>) {
    super({
      id: uniqueId(),

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

  /**
   * The line's direction.
   *
   * ```ts
   * const shapeDirection = shape.direction
   *
   * shape.direction = [0,0]
   * ```
   */
  get direction(): number[] {
    return this.shape.direction
  }
  set direction(direction: number[]) {
    this.utils.setProperty(this.shape, 'direction', direction)
  }
}
