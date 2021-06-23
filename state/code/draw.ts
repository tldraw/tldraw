import CodeShape from './index'
import { uniqueId } from 'utils/utils'
import { DrawShape, ShapeType } from 'types'
import { defaultStyle } from 'state/shape-styles'

/**
 * ## Draw
 */
export default class Draw extends CodeShape<DrawShape> {
  constructor(props = {} as Partial<DrawShape>) {
    super({
      id: uniqueId(),
      seed: Math.random(),
      type: ShapeType.Draw,
      isGenerated: false,
      name: 'Draw',
      parentId: 'page1',
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
}
