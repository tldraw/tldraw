import CodeShape from './index'
import { uniqueId } from 'utils'
import { DrawShape, ShapeProps, ShapeType } from 'types'
import { defaultStyle } from 'state/shape-styles'

/* ----------------- Start Copy Here ---------------- */

export default class Draw extends CodeShape<DrawShape> {
  constructor(props = {} as ShapeProps<DrawShape>) {
    super({
      id: uniqueId(),
      seed: Math.random(),
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
}
