/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { css } from '@stitches/core'
import { HTMLContainer, ShapeUtil } from '@tldraw/core'
import { defaultStyle } from '~shape/shape-styles'
import { StickyShape, TLDrawMeta, TLDrawShapeType, TLDrawToolType } from '~types'
import { getBoundsRectangle, transformRectangle, transformSingleRectangle } from '../shared'
import { getStickyFontStyle, getStickyShapeStyle } from '~shape'

const PADDING = 16
const MIN_CONTAINER_HEIGHT = 200

function normalizeText(text: string) {
  return text.replace(/\r?\n|\r/g, '\n')
}

export const Sticky = new ShapeUtil<StickyShape, HTMLDivElement, TLDrawMeta>(() => ({
  type: TLDrawShapeType.Sticky,

  isStateful: true,

  toolType: TLDrawToolType.Point,

  canBind: true,

  pathCache: new WeakMap<number[], string>([]),

  defaultProps: {
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

  shouldRender(prev, next) {
    return next.size !== prev.size || next.style !== prev.style || next.text !== prev.text
  },

  Component({ events, shape, isEditing, onShapeBlur, onShapeChange, meta }, ref) {
    const font = getStickyFontStyle(shape.style)

    const { color, fill } = getStickyShapeStyle(shape.style, meta.isDarkMode)

    const rContainer = React.useRef<HTMLDivElement>(null)

    const rTextArea = React.useRef<HTMLTextAreaElement>(null)

    const rText = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
      if (isEditing && document.activeElement !== rText.current) {
        requestAnimationFrame(() => rTextArea.current!.focus())
      }
    }, [isEditing])

    React.useEffect(() => {
      const handleWheel = (e: WheelEvent) => {
        const textarea = rTextArea.current
        if (!textarea) return

        if (document.activeElement === textarea) {
          e.stopPropagation()
        }
      }

      const elm = rContainer.current
      if (!elm) return

      elm.addEventListener('wheel', handleWheel)
      return () => {
        elm.removeEventListener('wheel', handleWheel)
      }
    }, [])

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
    }, [shape.text, shape.size[1]])

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
          style={{ backgroundColor: fill }}
        >
          <div ref={rText} className={styledText({ isEditing })} style={style}>
            {shape.text}
          </div>
          <textarea
            ref={rTextArea}
            className={styledStickyText({ isEditing })}
            style={style}
            onPointerDown={handlePointerDown}
            value={shape.text}
            onBlur={onShapeBlur}
            onChange={handleTextChange}
          />
        </div>
      </HTMLContainer>
    )
  },

  Indicator({ shape }) {
    const {
      size: [width, height],
    } = shape

    return (
      <rect x={0} y={0} rx={3} ry={3} width={Math.max(1, width)} height={Math.max(1, height)} />
    )
  },

  getBounds(shape) {
    return getBoundsRectangle(shape, this.boundsCache)
  },

  transform: transformRectangle,

  transformSingle: transformSingleRectangle,
}))

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
        boxShadow: '2px 3px 8px -2px rgba(0,0,0,.3), 0px 0px 2px rgba(0,0,0,.3)',
      },
      false: {
        boxShadow: '2px 3px 8px -2px rgba(0,0,0,.2), 0px 0px 2px rgba(0,0,0,.16)',
      },
    },
  },
})

const styledText = css({
  position: 'absolute',
  top: PADDING,
  left: PADDING,
  width: `calc(100% - ${PADDING * 2}px)`,
  height: 'fit-content',
  font: 'inherit',
  pointerEvents: 'none',
  whiteSpace: 'pre-wrap',
  variants: {
    isEditing: {
      true: {
        opacity: 0,
      },
      false: {
        opacity: 0,
      },
    },
  },
})

const styledStickyText = css({
  width: '100%',
  height: '100%',
  border: 'none',
  background: 'none',
  outline: 'none',
  textAlign: 'left',
  font: 'inherit',
  padding: 0,
  verticalAlign: 'top',
  resize: 'none',
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
})
