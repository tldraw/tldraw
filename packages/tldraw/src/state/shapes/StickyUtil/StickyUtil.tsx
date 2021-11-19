/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { Utils, HTMLContainer, TLBounds } from '@tldraw/core'
import { defaultTextStyle } from '../shared/shape-styles'
import { StickyShape, TDMeta, TDShapeType, TransformInfo } from '~types'
import { getBoundsRectangle, TextAreaUtils } from '../shared'
import { TDShapeUtil } from '../TDShapeUtil'
import { getStickyFontStyle, getStickyShapeStyle } from '../shared/shape-styles'
import { styled } from '~styles'
import Vec from '@tldraw/vec'
import { GHOSTED_OPACITY } from '~constants'
import { TLDR } from '~state/TLDR'

type T = StickyShape
type E = HTMLDivElement

export class StickyUtil extends TDShapeUtil<T, E> {
  type = TDShapeType.Sticky as const

  canBind = true

  canEdit = true

  hideResizeHandles = true

  getShape = (props: Partial<T>): T => {
    return Utils.deepMerge<T>(
      {
        id: 'id',
        type: TDShapeType.Sticky,
        name: 'Sticky',
        parentId: 'page',
        childIndex: 1,
        point: [0, 0],
        size: [200, 200],
        text: '',
        rotation: 0,
        style: defaultTextStyle,
      },
      props
    )
  }

  Component = TDShapeUtil.Component<T, E, TDMeta>(
    ({ shape, meta, events, isGhost, isEditing, onShapeBlur, onShapeChange }, ref) => {
      const font = getStickyFontStyle(shape.style)

      const { color, fill } = getStickyShapeStyle(shape.style, meta.isDarkMode)

      const rContainer = React.useRef<HTMLDivElement>(null)

      const rTextArea = React.useRef<HTMLTextAreaElement>(null)

      const rText = React.useRef<HTMLDivElement>(null)

      const rIsMounted = React.useRef(false)

      const handlePointerDown = React.useCallback((e: React.PointerEvent) => {
        e.stopPropagation()
      }, [])

      const handleTextChange = React.useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
          onShapeChange?.({
            id: shape.id,
            type: shape.type,
            text: TLDR.normalizeText(e.currentTarget.value),
          })
        },
        [onShapeChange]
      )

      const handleKeyDown = React.useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
          if (e.key === 'Escape') return

          if (e.key === 'Tab' && shape.text.length === 0) {
            e.preventDefault()
            return
          }

          e.stopPropagation()

          if (e.key === 'Tab') {
            e.preventDefault()
            if (e.shiftKey) {
              TextAreaUtils.unindent(e.currentTarget)
            } else {
              TextAreaUtils.indent(e.currentTarget)
            }

            onShapeChange?.({ ...shape, text: TLDR.normalizeText(e.currentTarget.value) })
          }
        },
        [shape, onShapeChange]
      )

      const handleBlur = React.useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
        e.currentTarget.setSelectionRange(0, 0)
        onShapeBlur?.()
      }, [])

      const handleFocus = React.useCallback(
        (e: React.FocusEvent<HTMLTextAreaElement>) => {
          if (!isEditing) return
          if (!rIsMounted.current) return
          e.currentTarget.select()
        },
        [isEditing]
      )

      // Focus when editing changes to true
      React.useEffect(() => {
        if (isEditing) {
          rIsMounted.current = true
          const elm = rTextArea.current!
          elm.focus()
          elm.select()
        }
      }, [isEditing])

      // Resize to fit text
      React.useEffect(() => {
        const text = rText.current!

        const { size } = shape
        const { offsetHeight: currTextHeight } = text
        const minTextHeight = MIN_CONTAINER_HEIGHT - PADDING * 2
        const prevTextHeight = size[1] - PADDING * 2

        // Same size? We can quit here
        if (currTextHeight === prevTextHeight) return

        if (currTextHeight > minTextHeight) {
          // Snap the size to the text content if the text only when the
          // text is larger than the minimum text height.
          onShapeChange?.({ id: shape.id, size: [size[0], currTextHeight + PADDING * 2] })
          return
        }

        if (currTextHeight < minTextHeight && size[1] > MIN_CONTAINER_HEIGHT) {
          // If we're smaller than the minimum height and the container
          // is too tall, snap it down to the minimum container height
          onShapeChange?.({ id: shape.id, size: [size[0], MIN_CONTAINER_HEIGHT] })
          return
        }

        const textarea = rTextArea.current
        textarea?.focus()
      }, [shape.text, shape.size[1], shape.style])

      const style = {
        font,
        color,
        textShadow: meta.isDarkMode
          ? `0.5px 0.5px 2px rgba(255, 255, 255,.25)`
          : `0.5px 0.5px 2px rgba(255, 255, 255,.5)`,
      }

      return (
        <HTMLContainer ref={ref} {...events}>
          <StyledStickyContainer
            ref={rContainer}
            isDarkMode={meta.isDarkMode}
            isGhost={isGhost}
            style={{ backgroundColor: fill, ...style }}
          >
            <StyledText ref={rText} isEditing={isEditing}>
              {shape.text}&#8203;
            </StyledText>
            {isEditing && (
              <StyledTextArea
                ref={rTextArea}
                onPointerDown={handlePointerDown}
                value={shape.text}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
                tabIndex={-1}
                autoComplete="false"
                autoCapitalize="false"
                autoCorrect="false"
                autoSave="false"
                autoFocus
                spellCheck={false}
              />
            )}
          </StyledStickyContainer>
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
    return next.size !== prev.size || next.style !== prev.style || next.text !== prev.text
  }

  transform = (
    shape: T,
    bounds: TLBounds,
    { scaleX, scaleY, transformOrigin }: TransformInfo<T>
  ): Partial<T> => {
    const point = Vec.round([
      bounds.minX +
        (bounds.width - shape.size[0]) * (scaleX < 0 ? 1 - transformOrigin[0] : transformOrigin[0]),
      bounds.minY +
        (bounds.height - shape.size[1]) *
          (scaleY < 0 ? 1 - transformOrigin[1] : transformOrigin[1]),
    ])

    return {
      point,
    }
  }

  transformSingle = (shape: T): Partial<T> => {
    return shape
  }
}

/* -------------------------------------------------- */
/*                       Helpers                      */
/* -------------------------------------------------- */

const PADDING = 16
const MIN_CONTAINER_HEIGHT = 200

const StyledStickyContainer = styled('div', {
  pointerEvents: 'all',
  position: 'relative',
  backgroundColor: 'rgba(255, 220, 100)',
  fontFamily: 'sans-serif',
  height: '100%',
  width: '100%',
  padding: PADDING + 'px',
  borderRadius: '3px',
  perspective: '800px',
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

const commonTextWrapping = {
  whiteSpace: 'pre-wrap',
  overflowWrap: 'break-word',
}

const StyledText = styled('div', {
  position: 'absolute',
  top: PADDING,
  left: PADDING,
  width: `calc(100% - ${PADDING * 2}px)`,
  height: 'fit-content',
  font: 'inherit',
  pointerEvents: 'none',
  userSelect: 'none',
  variants: {
    isEditing: {
      true: {
        opacity: 1,
      },
      false: {
        opacity: 1,
      },
    },
  },
  ...commonTextWrapping,
})

const StyledTextArea = styled('textarea', {
  width: '100%',
  height: '100%',
  border: 'none',
  overflow: 'hidden',
  background: 'none',
  outline: 'none',
  textAlign: 'left',
  font: 'inherit',
  padding: 0,
  color: 'transparent',
  verticalAlign: 'top',
  resize: 'none',
  caretColor: 'black',
  ...commonTextWrapping,
})
