import * as React from 'react'
import { makeObservable, observable } from 'mobx'
import { observer } from 'mobx-react-lite'
import { SVGContainer } from '~components'
import { TLNuShape, TLNuShapeProps } from '../../TLNuShape'
import { BoundsUtils } from '~utils'
import type { TLNuBounds } from '~types'
import type { TLNuComponentProps, TLNuIndicatorProps, TLNuResizeInfo } from '~nu-lib'

export interface TLNuDotShapeProps {
  radius: number
}

export class TLNuDotShape<P extends TLNuDotShapeProps = any> extends TLNuShape<P> {
  constructor(props = {} as TLNuShapeProps & Partial<P>) {
    super(props)
    this.init(props)
    makeObservable(this)
  }

  static id = 'dot'

  @observable radius = 4

  readonly hideBounds = true
  readonly hideResizeHandles = true
  readonly hideRotateHandle = true
  readonly hideBoundsDetail = true

  Component = observer(({ events }: TLNuComponentProps) => {
    const { radius } = this

    return (
      <SVGContainer {...events}>
        <circle
          cx={radius}
          cy={radius}
          r={radius}
          stroke={'#000'}
          fill={'#000'}
          pointerEvents="all"
        />
      </SVGContainer>
    )
  })

  Indicator = observer((props: TLNuIndicatorProps) => {
    const { radius } = this
    return <circle cx={radius} cy={radius} r={radius} />
  })

  getBounds = (): TLNuBounds => {
    const {
      point: [x, y],
      radius,
    } = this
    return {
      minX: x,
      minY: y,
      maxX: x + radius * 2,
      maxY: y + radius * 2,
      width: radius * 2,
      height: radius * 2,
    }
  }

  getRotatedBounds = (): TLNuBounds => {
    return BoundsUtils.getBoundsFromPoints(
      BoundsUtils.getRotatedCorners(this.bounds, this.rotation)
    )
  }

  onResize = (bounds: TLNuBounds, info: TLNuResizeInfo<P>): this => {
    const { radius } = this
    return this.update({
      point: [bounds.minX + bounds.width / 2 - radius, bounds.minY + bounds.height / 2 - radius],
    })
  }
}
