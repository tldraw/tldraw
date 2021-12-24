import * as React from 'react'
import { Utils, HTMLContainer } from '@tldraw/core'
import { TDShapeType, TDMeta, VideoShape } from '~types'
import { GHOSTED_OPACITY } from '~constants'
import { TDShapeUtil } from '../TDShapeUtil'
import {
  defaultStyle,
  getBoundsRectangle,
  transformRectangle,
  transformSingleRectangle,
} from '~state/shapes/shared'
import { styled } from '@stitches/react'

type T = VideoShape
type E = HTMLDivElement

export class VideoUtil extends TDShapeUtil<T, E> {
  type = TDShapeType.Video as const

  canBind = true

  canEdit = true

  canClone = true

  isAspectRatioLocked = true

  showCloneHandles = true

  getShape = (props: Partial<T>): T => {
    return Utils.deepMerge<T>(
      {
        id: 'video',
        type: TDShapeType.Video,
        name: 'Video',
        parentId: 'page',
        childIndex: 1,
        point: [0, 0],
        size: [1, 1],
        rotation: 0,
        style: defaultStyle,
        assetId: 'assetId',
      },
      props
    )
  }

  Component = TDShapeUtil.Component<T, E, TDMeta>(
    ({ shape, asset, isBinding, isGhost, meta, events, onShapeChange }, ref) => {
      const { size } = shape

      React.useEffect(() => {
        if (wrapperRef?.current) {
          const [width, height] = size
          wrapperRef.current.style.width = `${width}px`
          wrapperRef.current.style.height = `${height}px`
        }
      }, [size])

      const imgRef = React.useRef<HTMLVideoElement>(null)
      const wrapperRef = React.useRef<HTMLDivElement>(null)

      const onImageLoad = React.useCallback(() => {
        if (imgRef?.current && wrapperRef?.current) {
          const { videoWidth, videoHeight } = imgRef?.current
          wrapperRef.current.style.width = `${videoWidth}px`
          wrapperRef.current.style.height = `${videoHeight}px`
          onShapeChange?.({ id: shape.id, size: [videoWidth, videoHeight] })
        }
      }, [])

      return (
        <HTMLContainer ref={ref} {...events}>
          {isBinding && (
            <div
              className="tl-binding-indicator"
              style={{
                position: 'absolute',
                top: `calc(${-this.bindingDistance}px * var(--tl-zoom))`,
                left: `calc(${-this.bindingDistance}px * var(--tl-zoom))`,
                width: `calc(100% + ${this.bindingDistance * 2}px * var(--tl-zoom))`,
                height: `calc(100% + ${this.bindingDistance * 2}px * var(--tl-zoom))`,
                backgroundColor: 'var(--tl-selectFill)',
              }}
            />
          )}
          <Wrapper
            ref={wrapperRef}
            isDarkMode={meta.isDarkMode} //
            isGhost={isGhost}
          >
            <VideoElement muted autoPlay loop ref={imgRef} onLoadedMetadata={onImageLoad}>
              <source src={asset?.src} />
            </VideoElement>
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

const VideoElement = styled('video', {
  maxWidth: '100%',
  minWidth: '100%',
  pointerEvents: 'none',
})
