import CodeShape from './index'
import { uniqueId } from 'utils'
import { DotShape, ShapeStyles, ShapeType } from 'types'
import { defaultStyle } from 'state/shape-styles'

/**
 * ## Dot
 */
export default class Dot extends CodeShape<DotShape> {
  constructor(props = {} as Partial<DotShape> & Partial<ShapeStyles>) {
    super({
      id: uniqueId(),
      seed: Math.random(),
      parentId: (window as any).currentPageId,
      type: ShapeType.Dot,
      isGenerated: true,
      name: 'Dot',
      childIndex: 0,
      point: [0, 0],
      rotation: 0,
      isAspectRatioLocked: false,
      isLocked: false,
      isHidden: false,
      ...props,
      style: {
        ...defaultStyle,
        ...props.style,
        isFilled: true,
      },
    })
  }
}
