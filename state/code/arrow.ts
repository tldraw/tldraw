import CodeShape from './index'
import { uniqueId } from 'utils/utils'
import { ArrowShape, Decoration, ShapeProps, ShapeType } from 'types'
import { defaultStyle } from 'state/shape-styles'
import { getShapeUtils } from 'state/shape-utils'
import Vec from 'utils/vec'

/* ----------------- Start Copy Here ---------------- */

export default class Arrow extends CodeShape<ArrowShape> {
  constructor(
    props = {} as ShapeProps<ArrowShape> & { start: number[]; end: number[] }
  ) {
    const { start = [0, 0], end = [100, 100] } = props

    const {
      point = [0, 0],
      handles = {
        start: {
          id: 'start',
          index: 0,
          point: start,
        },
        end: {
          id: 'end',
          index: 1,
          point: end,
        },
        bend: {
          id: 'bend',
          index: 2,
          point: Vec.med(start, end),
        },
      },
    } = props

    super({
      id: uniqueId(),
      type: ShapeType.Arrow,
      name: 'Arrow',
      parentId: 'page1',
      childIndex: 0,
      point,
      rotation: 0,
      bend: 0,
      handles,
      decorations: {
        start: null,
        middle: null,
        end: Decoration.Arrow,
      },
      ...props,
      style: {
        ...defaultStyle,
        ...props.style,
        isFilled: false,
      },
    })
  }

  /**
   * The arrow's start point.
   *
   * ```ts
   * const startPoint = shape.start
   *
   * shape.start = [100, 100]
   * ```
   */
  get start(): number[] {
    return this.shape.handles.start.point
  }

  set start(point: number[]) {
    getShapeUtils(this.shape).onHandleChange(this.shape, {
      start: { ...this.shape.handles.start, point },
    })
  }

  /**
   * The arrow's middle point.
   *
   * ```ts
   * const middlePoint = shape.middle
   *
   * shape.middle = [100, 100]
   * ```
   */
  get middle(): number[] {
    return this.shape.handles.bend.point
  }

  set middle(point: number[]) {
    getShapeUtils(this.shape).onHandleChange(this.shape, {
      bend: { ...this.shape.handles.bend, point },
    })
  }

  /**
   * The arrow's end point.
   *
   * ```ts
   * const endPoint = shape.end
   *
   * shape.end = [100, 100]
   * ```
   */
  get end(): number[] {
    return this.shape.handles.end.point
  }

  set end(point: number[]) {
    getShapeUtils(this.shape).onHandleChange(this.shape, {
      end: { ...this.shape.handles.end, point },
    })
  }

  get bend(): number {
    return this.shape.bend
  }
}
