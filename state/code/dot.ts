import CodeShape from './index'
import { uniqueId } from 'utils/utils'
import { DotShape, ShapeProps, ShapeType } from 'types'
import { defaultStyle } from 'state/shape-styles'

/* ----------------- Start Copy Here ---------------- */

export default class Dot extends CodeShape<DotShape> {
  constructor(props = {} as ShapeProps<DotShape>) {
    super({
      id: uniqueId(),
      parentId: (window as any).currentPageId,
      type: ShapeType.Dot,
      isGenerated: true,
      name: 'Dot',
      childIndex: 0,
      point: [0, 0],
      rotation: 0,
      ...props,
      style: {
        ...defaultStyle,
        ...props.style,
        isFilled: true,
      },
    })
  }
}
