import CodeShape from './index'
import { uniqueId } from 'utils'
import { RayShape, ShapeProps, ShapeType } from 'types'
import { defaultStyle } from 'state/shape-styles'

/**
 * ## Ray
 */
export default class Ray extends CodeShape<RayShape> {
  constructor(props = {} as ShapeProps<RayShape>) {
    super({
      id: uniqueId(),
      seed: Math.random(),
      type: ShapeType.Ray,
      isGenerated: true,
      name: 'Ray',
      parentId: 'page1',
      childIndex: 0,
      point: [0, 0],
      direction: [0, 1],
      rotation: 0,
      isAspectRatioLocked: false,
      isLocked: false,
      isHidden: false,
      ...props,
      style: {
        ...defaultStyle,
        ...props.style,
        isFilled: false,
      },
    })
  }

  get direction(): number[] {
    return this.shape.direction
  }
}
