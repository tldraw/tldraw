import Vec from '@tldraw/vec'
import { computed, makeObservable, observable } from 'mobx'
import { TLNuBoxShape, TLNuBoxShapeProps, TLNuShapeProps } from '~nu-lib'
import { BoundsUtils, PolygonUtils } from '~utils'

export interface TLNuPolygonShapeProps extends TLNuBoxShapeProps {
  sides: number
}

export abstract class TLNuPolygonShape<P extends TLNuPolygonShapeProps> extends TLNuBoxShape<P> {
  constructor(props = {} as TLNuShapeProps & Partial<P>) {
    super(props)
    const { sides = 3 } = props
    this.sides = sides
    makeObservable(this)
  }

  @observable sides: number

  static id = 'polygon'

  getVertices(padding = 0) {
    const {
      sides,
      size: [w, h],
    } = this
    return sides === 3
      ? [
          [w / 2, padding / 2],
          [w - padding, h - padding],
          [padding / 2, h - padding],
        ]
      : PolygonUtils.getPolygonInEllipse(
          Vec.div([w, h], 2),
          w / 2 - padding / 2,
          h / 2 - padding / 2,
          sides
        )
  }

  @computed get vertices() {
    return this.getVertices()
  }

  @computed get offset() {
    const {
      size: [w, h],
    } = this
    const center = BoundsUtils.getBoundsCenter(BoundsUtils.getBoundsFromPoints(this.vertices))
    return Vec.sub(Vec.div([w, h], 2), center)
  }

  @computed get pageVertices() {
    const { point, vertices } = this
    return vertices.map((vert) => Vec.add(vert, point))
  }
}
