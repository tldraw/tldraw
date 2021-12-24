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
import Vec from '@tldraw/vec'

type T = VideoShape
type E = HTMLDivElement

export class VideoUtil extends TDShapeUtil<T, E> {
  type = TDShapeType.Video as const
  canBind = true
  canEdit = true
  canClone = true
  isAspectRatioLocked = true
  showCloneHandles = true
  isStateful = true // don't unmount

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
        isPlaying: true,
        currentTime: 0,
      },
      props
    )
  }

  Component = TDShapeUtil.Component<T, E, TDMeta>(
    ({ shape, asset, isBinding, isEditing, isGhost, meta, events, onShapeChange }, ref) => {
      const rVideo = React.useRef<HTMLVideoElement>(null)
      const wrapperRef = React.useRef<HTMLDivElement>(null)

      const { currentTime = 0, size, isPlaying } = shape

      React.useEffect(() => {
        if (wrapperRef.current) {
          const [width, height] = size
          wrapperRef.current.style.width = `${width}px`
          wrapperRef.current.style.height = `${height}px`
        }
      }, [size])

      const onImageLoad = React.useCallback(() => {
        if (rVideo.current && wrapperRef.current) {
          if (!Vec.isEqual(size, [401.42, 401.42])) return
          const { videoWidth, videoHeight } = rVideo.current
          wrapperRef.current.style.width = `${videoWidth}px`
          wrapperRef.current.style.height = `${videoHeight}px`
          const newSize = [videoWidth, videoHeight]
          const delta = Vec.sub(size, newSize)
          onShapeChange?.({
            id: shape.id,
            point: Vec.add(shape.point, Vec.div(delta, 2)),
            size: [videoWidth, videoHeight],
          })
        }
      }, [size])

      React.useLayoutEffect(() => {
        const video = rVideo.current
        if (!video) return
        if (isPlaying) video.play()
        // throws error on safari
        else video.pause()
      }, [isPlaying])

      React.useLayoutEffect(() => {
        const video = rVideo.current
        if (!video) return
        if (currentTime !== video.currentTime) {
          video.currentTime = currentTime
        }
      }, [currentTime])

      const handlePlay = React.useCallback(() => {
        onShapeChange?.({ id: shape.id, isPlaying: true })
      }, [])

      const handlePause = React.useCallback(() => {
        onShapeChange?.({ id: shape.id, isPlaying: false })
      }, [])

      const handleSetCurrentTime = React.useCallback(() => {
        const video = rVideo.current
        if (!video) return
        if (!isEditing) return
        onShapeChange?.({ id: shape.id, currentTime: video.currentTime })
      }, [isEditing])

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
          <Wrapper ref={wrapperRef} isDarkMode={meta.isDarkMode} isGhost={isGhost}>
            <VideoElement
              ref={rVideo}
              id={shape.id + '_video'}
              muted
              loop
              playsInline
              disableRemotePlayback
              disablePictureInPicture
              controls={isEditing}
              autoPlay={isPlaying}
              onPlay={handlePlay}
              onPause={handlePause}
              onTimeUpdate={handleSetCurrentTime}
              onLoadedMetadata={onImageLoad}
            >
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
    return next.size !== prev.size || next.style !== prev.style || next.isPlaying !== prev.isPlaying
  }

  transform = transformRectangle

  transformSingle = transformSingleRectangle
}

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
  pointerEvents: 'all',
  // variants: {
  //   isEditing: {
  //     true: {
  //       pointerEvents: 'all',
  //     },
  //     false: {
  //       pointerEvents: 'none',
  //     },
  //   },
  // },
})
