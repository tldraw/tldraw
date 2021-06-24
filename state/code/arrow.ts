import CodeShape from './index'
import { uniqueId } from 'utils'
import { ArrowShape, Decoration, ShapeStyles, ShapeType } from 'types'
import { defaultStyle } from 'state/shape-styles'
import { getShapeUtils } from 'state/shape-utils'
import Vec from 'utils/vec'

/**
 * ## Draw
 */
export default class Arrow extends CodeShape<ArrowShape> {
  constructor(
    props = {} as Partial<ArrowShape> &
      Partial<ShapeStyles> & { start?: number[]; end?: number[] }
  ) {
    const { start = [0, 0], end = [0, 0] } = props

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
      seed: Math.random(),
      type: ShapeType.Arrow,
      isGenerated: false,
      name: 'Arrow',
      parentId: 'page1',
      childIndex: 0,
      point,
      rotation: 0,
      isAspectRatioLocked: false,
      isLocked: false,
      isHidden: false,
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

  get start(): number[] {
    return this.shape.handles.start.point
  }

  set start(point: number[]) {
    getShapeUtils(this.shape).onHandleChange(this.shape, {
      start: { ...this.shape.handles.start, point },
    })
  }

  get middle(): number[] {
    return this.shape.handles.bend.point
  }

  set middle(point: number[]) {
    getShapeUtils(this.shape).onHandleChange(this.shape, {
      bend: { ...this.shape.handles.bend, point },
    })
  }

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
