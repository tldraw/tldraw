/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { Utils, HTMLContainer, TLBounds, TLIndicator, TLComponent } from '@tldraw/core'
import { defaultStyle } from '../shape-styles'
import { StickyShape, TLDrawShapeType, TLDrawTransformInfo } from '~types'
import { getBoundsRectangle, TextAreaUtils } from '../shared'
import { TLDrawShapeUtil } from '../TLDrawShapeUtil'
import { getStickyFontStyle, getStickyShapeStyle } from '../shape-styles'
import css from '~styles'
import Vec from '@tldraw/vec'

type T = StickyShape
type E = HTMLDivElement

export class StickyUtil extends TLDrawShapeUtil<T, E> {
  type = TLDrawShapeType.Sticky as const

  canBind = true

  getShape = (props: Partial<T>): T => {
    return Utils.deepMerge<T>(
      {
        id: 'id',
        type: TLDrawShapeType.Sticky,
        name: 'Sticky',
        parentId: 'page',
        childIndex: 1,
        point: [0, 0],
        size: [200, 200],
        text: '',
        rotation: 0,
        style: defaultStyle,
      },
      props
    )
  }

  Component: TLComponent<T, E> = (
    { shape, meta, events, isEditing, onShapeBlur, onShapeChange },
    ref
  ) => {
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
          text: normalizeText(e.currentTarget.value),
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

          onShapeChange?.({ ...shape, text: normalizeText(e.currentTarget.value) })
        }
      },
      [shape, onShapeChange]
    )

    const handleBlur = React.useCallback(
      (e: React.FocusEvent<HTMLTextAreaElement>) => {
        if (!isEditing) return
        if (rIsMounted.current) {
          e.currentTarget.setSelectionRange(0, 0)
          onShapeBlur?.()
        }
      },
      [isEditing]
    )

    const handleFocus = React.useCallback(
      (e: React.FocusEvent<HTMLTextAreaElement>) => {
        if (!isEditing) return
        if (!rIsMounted.current) return

        if (document.activeElement === e.currentTarget) {
          e.currentTarget.select()
        }
      },
      [isEditing]
    )

    // Focus when editing changes to true
    React.useEffect(() => {
      if (isEditing) {
        if (document.activeElement !== rText.current) {
          requestAnimationFrame(() => {
            rIsMounted.current = true
            const elm = rTextArea.current!
            elm.focus()
            elm.select()
          })
        }
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
        <div
          ref={rContainer}
          className={styledStickyContainer({ isDarkMode: meta.isDarkMode })}
          style={{ backgroundColor: fill, ...style }}
        >
          <div ref={rText} className={styledText({ isEditing })}>
            {shape.text}&#8203;
          </div>
          {isEditing && (
            <textarea
              ref={rTextArea}
              className={styledTextArea({ isEditing })}
              onPointerDown={handlePointerDown}
              value={shape.text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              autoCapitalize="off"
              autoComplete="off"
              spellCheck={false}
              autoFocus
            />
          )}
        </div>
      </HTMLContainer>
    )
  }

  Indicator: TLIndicator<T> = ({ shape }) => {
    const {
      size: [width, height],
    } = shape

    return (
      <rect x={0} y={0} rx={3} ry={3} width={Math.max(1, width)} height={Math.max(1, height)} />
    )
  }

  getBounds = (shape: T) => {
    return getBoundsRectangle(shape, this.boundsCache)
  }

  shouldRender = (prev: T, next: T) => {
    return next.size !== prev.size || next.style !== prev.style || next.text !== prev.text
  }

  transform = (
    shape: T,
    bounds: TLBounds,
    { scaleX, scaleY, transformOrigin }: TLDrawTransformInfo<T>
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

function normalizeText(text: string) {
  return text.replace(/\r?\n|\r/g, '\n')
}

const styledStickyContainer = css({
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

const commonTextWrapping = css({
  whiteSpace: 'pre-wrap',
  overflowWrap: 'break-word',
})

const styledText = css(
  {
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
  },
  commonTextWrapping
)

const styledTextArea = css(
  {
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
  },
  commonTextWrapping
)
