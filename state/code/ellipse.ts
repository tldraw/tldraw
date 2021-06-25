import CodeShape from './index'
import { uniqueId } from 'utils'
import { EllipseShape, ShapeProps, ShapeType } from 'types'
import { defaultStyle } from 'state/shape-styles'

/* ----------------- Start Copy Here ---------------- */

export default class Ellipse extends CodeShape<EllipseShape> {
  constructor(props = {} as ShapeProps<EllipseShape>) {
    super({
      id: uniqueId(),
      seed: Math.random(),
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

  get radiusX(): number {
    return this.shape.radiusX
  }

  get radiusY(): number {
    return this.shape.radiusY
  }
}
