import CodeShape from './index'
import { uniqueId } from 'utils/utils'
import { RectangleShape, ShapeProps, ShapeType } from 'types'
import { defaultStyle } from 'state/shape-styles'
import { getShapeUtils } from 'state/shape-utils'

/* ----------------- Start Copy Here ---------------- */

export default class Rectangle extends CodeShape<RectangleShape> {
  constructor(props = {} as ShapeProps<RectangleShape>) {
    super({
      id: uniqueId(),

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
      style: {
        ...defaultStyle,
        ...props.style,
      },
    })
  }

  /**
   * The rectangle's width.
   *
   * ```ts
   * const shapeWidth = shape.width
   *
   * shape.width = 100
   * ```
   */
  get width(): number {
    return this.shape.size[0]
  }

  set width(width: number) {
    getShapeUtils(this.shape).setProperty(this.shape, 'size', [
      width,
      this.height,
    ])
  }

  /**
   * The rectangle's height.
   *
   * ```ts
   * const shapeHeight = shape.height
   *
   * shape.height = 100
   * ```
   */
  get height(): number {
    return this.shape.size[1]
  }

  set height(height: number) {
    getShapeUtils(this.shape).setProperty(this.shape, 'size', [
      this.width,
      height,
    ])
  }
}
