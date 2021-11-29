/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { Utils, HTMLContainer } from '@tldraw/core'
import { ImageShape, TDShapeType, TDMeta } from '~types'
import { TDShapeUtil } from '../TDShapeUtil'
import { styled } from '~styles'
import {
  defaultStyle,
  getShapeStyle,
  getBoundsRectangle,
  transformRectangle,
  transformSingleRectangle,
} from '~state/shapes/shared'

type T = ImageShape
type E = HTMLDivElement

export class ImageUtil extends TDShapeUtil<T, E> {
  type = TDShapeType.Image as const

  isAspectRatioLocked = true

  canBind = true

  getShape = (props: Partial<T>): T => {
    return Utils.deepMerge<T>(
      {
        id: 'id',
        type: TDShapeType.Image,
        name: 'Image',
        parentId: 'page',
        childIndex: 1,
        point: [0, 0],
        size: [1, 1],
        rotation: 0,
        style: defaultStyle,
        data: '',
      },
      props
    )
  }

  Component = TDShapeUtil.Component<T, E, TDMeta>(({ shape, events }, ref) => {
    const rImg = React.useRef<HTMLImageElement>(null)

    const onImageLoad = () => {
      if (rImg && rImg.current) {
        const { width, height } = rImg?.current
        shape.size = [width, height]
      }
    }
    return (
      <HTMLContainer ref={ref} {...events}>
        <Wrapper>
          <img
            src={`data:image/png;base64, ${shape.data}`}
            alt="test"
            style={{ pointerEvents: 'none', width: '100%', height: '100%' }}
            ref={rImg}
            onLoad={onImageLoad}
          />
        </Wrapper>
      </HTMLContainer>
    )
  })

  Indicator = TDShapeUtil.Indicator<T>(({ shape }) => {
    const {
      style,
      size: [width, height],
    } = shape

    const styles = getShapeStyle(style, false)
    const sw = styles.strokeWidth

    return (
      <rect
        x={sw}
        y={sw}
        rx={1}
        ry={1}
        width={Math.max(1, width - sw * 2)}
        height={Math.max(1, height - sw * 2)}
      />
    )
  })

  getBounds = (shape: T) => {
    return getBoundsRectangle(shape, this.boundsCache)
  }

  shouldRender = (prev: T, next: T) => {
    return next.size !== prev.size || next.style !== prev.style
  }

  transform = transformRectangle

  transformSingle = transformSingleRectangle
}

const Wrapper = styled('div', {
  width: '100%',
  height: '100%',
  pointerEvents: 'all',
})
