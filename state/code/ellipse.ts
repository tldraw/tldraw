import CodeShape from './index'
import { uniqueId } from 'utils'
import { EllipseShape, ShapeProps, ShapeType } from 'types'
import { defaultStyle } from 'state/shape-styles'

/* ----------------- Start Copy Here ---------------- */

export default class Ellipse extends CodeShape<EllipseShape> {
  constructor(props = {} as ShapeProps<EllipseShape>) {
    super({
      id: uniqueId(),
      parentId: (window as any).currentPageId,
      type: ShapeType.Ellipse,
      isGenerated: true,
      name: 'Ellipse',
      childIndex: 0,
      point: [0, 0],
      radiusX: 50,
      radiusY: 50,
      rotation: 0,
      isAspectRatioLocked: false,
      isLocked: false,
      isHidden: false,
      ...props,
      style: { ...defaultStyle, ...props.style },
    })
  }

  /**
   * The ellipse's x radius.
   *
   * ```ts
   * const shapeRadiusX = shape.radiusX
   *
   * shape.radiusX = 100
   * ```
   */
  get radiusX(): number {
    return this.shape.radiusX
  }

  set radiusX(radiusX: number) {
    this.utils.setProperty(this.shape, 'radiusX', radiusX)
  }

  /**
   * The ellipse's y radius.
   *
   * ```ts
   * const shapeRadiusY = shape.radiusY
   *
   * shape.radiusY = 100
   * ```
   */
  get radiusY(): number {
    return this.shape.radiusY
  }

  set radiusY(radiusY: number) {
    this.utils.setProperty(this.shape, 'radiusY', radiusY)
  }
}
