import CodeShape from './index'
import { uniqueId } from 'utils/utils'
import { PolylineShape, ShapeStyles, ShapeType } from 'types'
import { defaultStyle } from 'state/shape-styles'

/**
 * ## Polyline
 */
export default class Polyline extends CodeShape<PolylineShape> {
  constructor(props = {} as Partial<PolylineShape> & Partial<ShapeStyles>) {
    super({
      id: uniqueId(),
      seed: Math.random(),
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
      style: defaultStyle,
      ...props,
    })
  }

  get points(): number[][] {
    return this.shape.points
  }
}
