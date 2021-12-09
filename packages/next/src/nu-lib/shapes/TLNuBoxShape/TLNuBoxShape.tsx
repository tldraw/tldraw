import * as React from 'react'
import { makeObservable, observable } from 'mobx'
import { observer } from 'mobx-react-lite'
import { SVGContainer } from '~components'
import { TLNuShape, TLNuShapeProps } from '../../TLNuShape'
import { BoundsUtils } from '~utils'
import type { AnyObject, TLNuBounds } from '~types'
import type { TLNuComponentProps, TLNuIndicatorProps, TLNuResizeInfo } from '~nu-lib'

export interface TLNuBoxShapeProps {
  size: number[]
}

export class TLNuBoxShape<P extends TLNuBoxShapeProps = any> extends TLNuShape<
  P & TLNuBoxShapeProps
> {
  constructor(props = {} as TLNuShapeProps & Partial<P & TLNuBoxShapeProps>) {
    super(props)
    this.init(props)
    makeObservable(this)
  }

  static id = 'box'

  @observable size: number[] = [100, 100]

  Component = observer(({ events }: TLNuComponentProps) => {
    const {
      size: [w, h],
    } = this

    return (
      <SVGContainer {...events}>
        <rect
          width={Math.max(0.01, w)}
          height={Math.max(0.01, h)}
          stroke={'#000'}
          fill={'none'}
          strokeWidth={2}
          pointerEvents="all"
        />
      </SVGContainer>
    )
  })

  Indicator = observer((props: TLNuIndicatorProps) => {
    return <rect width={this.size[0]} height={this.size[1]} strokeWidth={2} fill="transparent" />
  })

  getBounds = (): TLNuBounds => {
    const [x, y] = this.point
    const [width, height] = this.size
    return {
      minX: x,
      minY: y,
      maxX: x + width,
      maxY: y + height,
      width,
      height,
    }
  }

  getRotatedBounds = (): TLNuBounds => {
    return BoundsUtils.getBoundsFromPoints(
      BoundsUtils.getRotatedCorners(this.bounds, this.rotation)
    )
  }

  onResize = (bounds: TLNuBounds, info: TLNuResizeInfo<P>): this => {
    return this.update({
      point: [bounds.minX, bounds.minY],
      size: [Math.max(1, bounds.width), Math.max(1, bounds.height)],
    })
  }
}
