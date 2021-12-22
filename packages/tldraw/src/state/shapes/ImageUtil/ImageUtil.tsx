import * as React from 'react'
import { Utils, SVGContainer, HTMLContainer } from '@tldraw/core'
import { Vec } from '@tldraw/vec'
import { getStroke, getStrokePoints } from 'perfect-freehand'
import { RectangleShape, DashStyle, TDShapeType, TDMeta, ImageShape } from '~types'
import { GHOSTED_OPACITY } from '~constants'
import { TDShapeUtil } from '../TDShapeUtil'
import {
  defaultStyle,
  getShapeStyle,
  getBoundsRectangle,
  transformRectangle,
  transformSingleRectangle,
} from '~state/shapes/shared'
import { UploadIcon } from '@radix-ui/react-icons'
import { styled } from '@stitches/react'

type T = ImageShape
type E = HTMLDivElement

export class ImageUtil extends TDShapeUtil<T, E> {
  type = TDShapeType.Image as const

  canBind = true

  canEdit = true

  canClone = true

  isAspectRatioLocked = true

  showCloneHandles = true

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
        data: {},
      },
      props
    )
  }

  Component = TDShapeUtil.Component<T, E, TDMeta>(
    ({ shape, isBinding, isSelected, isEditing, isGhost, meta, events }, ref) => {
      const { size } = shape

      React.useEffect(() => {
        if (wrapperRef?.current) {
          const [width, height] = size
          wrapperRef.current.style.width = `${width}px`
          wrapperRef.current.style.height = `${height}px`
        }
      }, [size])

      const imgRef = React.useRef<HTMLImageElement>(null)
      const wrapperRef = React.useRef<HTMLDivElement>(null)

      const onImageLoad = () => {
        if (imgRef?.current && wrapperRef?.current) {
          const { width, height } = imgRef?.current
          wrapperRef.current.style.width = `${width}px`
          wrapperRef.current.style.height = `${height}px`
          shape.size = [width, height]
        }
      }

      return (
        <HTMLContainer ref={ref} {...events}>
          {isBinding && (
            <div
              className="tl-binding-indicator"
              style={{
                position: 'absolute',
                top: -this.bindingDistance,
                left: -this.bindingDistance,
                width: `calc(100% + ${this.bindingDistance * 2}px)`,
                height: `calc(100% + ${this.bindingDistance * 2}px)`,
                backgroundColor: 'var(--tl-selectFill)',
              }}
            />
          )}
          <Wrapper
            ref={wrapperRef}
            isDarkMode={meta.isDarkMode} //
            isGhost={isGhost}
          >
            <ImageElement
              src={shape.data.src}
              alt="test"
              style={{ maxWidth: '100%' }}
              draggable={false}
              ref={imgRef}
              onLoad={onImageLoad}
            />
          </Wrapper>
        </HTMLContainer>
      )
    }
  )

  Indicator = TDShapeUtil.Indicator<T>(({ shape }) => {
    const {
      size: [width, height],
    } = shape

    return (
      <rect x={0} y={0} rx={3} ry={3} width={Math.max(1, width)} height={Math.max(1, height)} />
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

const IconWrapper = styled('div', {
  width: '100%',
  height: '100%',
  backgroundColor: 'white',
  borderRadius: '10px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  flexDirection: 'column',
  '&:hover': {
    cursor: 'pointer',
  },
})

const Wrapper = styled('div', {
  pointerEvents: 'all',
  position: 'relative',
  fontFamily: 'sans-serif',
  fontSize: '2em',
  height: '100%',
  width: '100%',
  borderRadius: '3px',
  perspective: '800px',
  p: {
    userSelect: 'none',
  },
  img: {
    userSelect: 'none',
  },
  variants: {
    isGhost: {
      false: { opacity: 1 },
      true: { transition: 'opacity .2s', opacity: GHOSTED_OPACITY },
    },
    isDarkMode: {
      true: {
        boxShadow:
          '2px 3px 12px -2px rgba(0,0,0,.3), 1px 1px 4px rgba(0,0,0,.3), 1px 1px 2px rgba(0,0,0,.3)',
      },
      false: {
        boxShadow:
          '2px 3px 12px -2px rgba(0,0,0,.2), 1px 1px 4px rgba(0,0,0,.16),  1px 1px 2px rgba(0,0,0,.16)',
      },
    },
  },
})

const ImageElement = styled('img', {
  maxWidth: '100%',
  minWidth: '100%',
  pointerEvents: 'none',
})
