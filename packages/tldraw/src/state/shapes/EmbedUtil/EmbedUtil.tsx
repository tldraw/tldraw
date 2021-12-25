import * as React from 'react'
import { Utils, HTMLContainer } from '@tldraw/core'
import { TDShapeType, TDMeta, EmbedShape } from '~types'
import { GHOSTED_OPACITY } from '~constants'
import { TDShapeUtil } from '../TDShapeUtil'
import {
  defaultStyle,
  getBoundsRectangle,
  transformRectangle,
  transformSingleRectangle,
} from '~state/shapes/shared'
import { styled } from '@stitches/react'
import { TldrawApp } from '~state'

type T = EmbedShape
type E = HTMLDivElement

export class EmbedUtil extends TDShapeUtil<T, E> {
  type = TDShapeType.Embed as const

  canBind = true

  canEdit = true

  canClone = true

  showCloneHandles = true

  getShape = (props: Partial<T>): T => {
    return Utils.deepMerge<T>(
      {
        id: 'embed',
        type: TDShapeType.Embed,
        name: 'Embed',
        parentId: 'page',
        childIndex: 1,
        point: [0, 0],
        size: [1, 1],
        rotation: 0,
        style: defaultStyle,
        assetId: 'assetId',
        src: 'https://www.google.com',
      },
      props
    )
  }

  Component = TDShapeUtil.Component<T, E, TDMeta>(
    ({ shape, isEditing, isBinding, isGhost, meta, events, onShapeChange }, ref) => {
      const { size, src } = shape
      const [url, setUrl] = React.useState<string>(src)
      const rInitialUrl = React.useRef(url)

      React.useLayoutEffect(() => {
        if (rWrapper?.current) {
          const [width, height] = size
          rWrapper.current.style.width = `${width}px`
          rWrapper.current.style.height = `${height}px`
        }
      }, [size])

      const rFrame = React.useRef<HTMLIFrameElement>(null)
      const rWrapper = React.useRef<HTMLDivElement>(null)

      const handleInputFocus = React.useCallback<React.FocusEventHandler<HTMLInputElement>>((e) => {
        rInitialUrl.current = e.currentTarget.value
      }, [])

      const handleInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setUrl(e.currentTarget.value)
      }, [])

      const handleInputBlur = React.useCallback<React.FocusEventHandler<HTMLInputElement>>((e) => {
        const url = e.currentTarget.value
        if (TldrawApp.isValidHttpUrl(url)) {
          if (url !== rInitialUrl.current) {
            onShapeChange?.({ id: shape.id, src: url })
          }
        } else {
          e.currentTarget.value = rInitialUrl.current
          setUrl(rInitialUrl.current)
        }
      }, [])

      const handleInputKeyDown = React.useCallback<React.KeyboardEventHandler<HTMLInputElement>>(
        (e) => {
          switch (e.key) {
            case 'Enter': {
              e.currentTarget.blur()
              break
            }
            case 'Escape': {
              e.currentTarget.value = rInitialUrl.current
              setUrl(rInitialUrl.current)
              e.currentTarget.blur()
              break
            }
          }
        },
        []
      )

      const handleWheel = React.useCallback<React.WheelEventHandler<HTMLDivElement>>(
        (e) => {
          if (isEditing) e.preventDefault()
        },
        [isEditing]
      )

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
            ref={rWrapper}
            isDarkMode={meta.isDarkMode} //
            isGhost={isGhost}
          >
            <FrameElement
              ref={rFrame}
              id={shape.id + '_frame'}
              focused={isEditing}
              src={src}
              draggable={false}
              onWheel={handleWheel}
            />
            {isEditing && (
              <InputContainer>
                <Input
                  type="text"
                  placeholder="url"
                  value={url}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  onKeyDown={handleInputKeyDown}
                />
              </InputContainer>
            )}
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

const Wrapper = styled('div', {
  pointerEvents: 'all',
  position: 'relative',
  fontFamily: 'sans-serif',
  fontSize: '2em',
  height: '100%',
  width: '100%',
  borderRadius: 2,
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

const FrameElement = styled('iframe', {
  maxWidth: '100%',
  minWidth: '100%',
  maxHeight: '100%',
  minHeight: '100%',
  userSelect: 'none',
  border: 'none',
  variants: {
    focused: {
      false: { pointerEvents: 'none' },
      true: { pointerEvents: 'all' },
    },
  },
})

const InputContainer = styled('div', {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
})

const Input = styled('input', {
  width: '100%',
  padding: '4px 0px',
  textAlign: 'left',
  fontSize: 'var(--fontSizes-1)',
  outline: 'none',
  border: 'none',
  background: 'transparent',
  borderBottom: '1px solid #cfcfcf',
  fontFamily: 'var(--fonts-ui)',
  fontWeight: 'lighter',
  fontStyle: 'italic',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',

  '&::placeholder': {
    color: '#cfcfcf',
  },
})
