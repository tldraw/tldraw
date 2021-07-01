import CodeShape from './index'
import { uniqueId } from 'utils/utils'
import { DrawShape, ShapeProps, ShapeType } from 'types'
import { defaultStyle } from 'state/shape-styles'

/* ----------------- Start Copy Here ---------------- */

export default class Draw extends CodeShape<DrawShape> {
  constructor(props = {} as ShapeProps<DrawShape>) {
    super({
      id: uniqueId(),

      type: ShapeType.Draw,
      isGenerated: false,
      parentId: (window as any).currentPageId,
      name: 'Draw',
      childIndex: 0,
      point: [0, 0],
      points: [],
      rotation: 0,
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
   * Add a point to the draw shape's points.
   *
   * ```ts
   * shape.addPoint([100,100])
   * ```
   */
  addPoint(point: number[]): CodeShape<DrawShape> {
    this.utils.setProperty(this.shape, 'points', [...this.points, point])
    return this
  }

  /**
   * The draw shape's points.
   *
   * ```ts
   * const shapePoints = shape.points
   *
   * shape.points = [[0,0], [100,100], [100,200]]
   * ```
   */
  get points(): number[][] {
    return this.shape.points
  }

  set points(points: number[][]) {
    this.utils.setProperty(this.shape, 'points', points)
  }
}
