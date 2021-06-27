import CodeShape from './index'
import { uniqueId } from 'utils'
import { RayShape, ShapeProps, ShapeType } from 'types'
import { defaultStyle } from 'state/shape-styles'

/* ----------------- Start Copy Here ---------------- */

export default class Ray extends CodeShape<RayShape> {
  constructor(props = {} as ShapeProps<RayShape>) {
    super({
      id: uniqueId(),

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

  /**
   * The ray's direction.
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
