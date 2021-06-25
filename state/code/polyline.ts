import CodeShape from './index'
import { uniqueId } from 'utils'
import { PolylineShape, ShapeProps, ShapeType } from 'types'
import { defaultStyle } from 'state/shape-styles'

/* ----------------- Start Copy Here ---------------- */

export default class Polyline extends CodeShape<PolylineShape> {
  constructor(props = {} as ShapeProps<PolylineShape>) {
    super({
      id: uniqueId(),

      parentId: (window as any).currentPageId,
      type: ShapeType.Polyline,
      isGenerated: true,
      name: 'Polyline',
      childIndex: 0,
      point: [0, 0],
      points: [[0, 0]],
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

  get points(): number[][] {
    return this.shape.points
  }
}
