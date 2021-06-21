import CodeShape from './index'
import { uniqueId } from 'utils/utils'
import { EllipseShape, ShapeType } from 'types'
import Utils from './utils'
import { defaultStyle } from 'state/shape-styles'

export default class Ellipse extends CodeShape<EllipseShape> {
  constructor(props = {} as Partial<EllipseShape>) {
    props.point = Utils.vectorToPoint(props.point)

    super({
      id: uniqueId(),
      seed: Math.random(),
      parentId: (window as any).currentPageId,
      type: ShapeType.Ellipse,
      isGenerated: true,
      name: 'Ellipse',
      childIndex: 0,
      point: [0, 0],
      radiusX: 20,
      radiusY: 20,
      rotation: 0,
      isAspectRatioLocked: false,
      isLocked: false,
      isHidden: false,
      ...props,
      style: { ...defaultStyle, ...props.style },
    })
  }

  export(): EllipseShape {
    const shape = { ...this.shape }

    shape.point = Utils.vectorToPoint(shape.point)

    return shape
  }

  get radiusX(): number {
    return this.shape.radiusX
  }

  get radiusY(): number {
    return this.shape.radiusY
  }
}
