/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { HTMLContainer, TLBounds, Utils, ShapeUtil } from '@tldraw/core'
import { Vec } from '@tldraw/vec'
import { getShapeStyle, getFontStyle, defaultStyle } from '~shape/shape-styles'
import { TextShape, TLDrawShapeType, TLDrawToolType, TLDrawMeta } from '~types'
import css from '~styles'
import TextAreaUtils from './text-utils'

const LETTER_SPACING = -1.5

function normalizeText(text: string) {
  return text.replace(/\r?\n|\r/g, '\n')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// let melm: any

// function getMeasurementDiv() {
//   // A div used for measurement
//   document.getElementById('__textMeasure')?.remove()

//   const pre = document.createElement('pre')
//   pre.id = '__textMeasure'

//   Object.assign(pre.style, {
//     whiteSpace: 'pre',
//     width: 'auto',
//     border: '1px solid red',
//     padding: '4px',
//     margin: '0px',
//     letterSpacing: `${LETTER_SPACING}px`,
//     opacity: '0',
//     position: 'absolute',
//     top: '-500px',
//     left: '0px',
//     zIndex: '9999',
//     pointerEvents: 'none',
//     userSelect: 'none',
//     alignmentBaseline: 'mathematical',
//     dominantBaseline: 'mathematical',
//   })

//   pre.tabIndex = -1

//   document.body.appendChild(pre)
//   return pre
// }

// if (typeof window !== 'undefined') {
//   melm = getMeasurementDiv()
// }

export const Text = new ShapeUtil<TextShape, HTMLDivElement, TLDrawMeta>(() => ({
  type: TLDrawShapeType.Text,

  toolType: TLDrawToolType.Text,

  isAspectRatioLocked: true,

  isEditableText: true,

  canBind: true,

  defaultProps: {
    id: 'id',
    type: TLDrawShapeType.Text,
    name: 'Text',
    parentId: 'page',
    childIndex: 1,
    point: [0, 0],
    rotation: 0,
    text: ' ',
    style: defaultStyle,
  },

  shouldRender(prev, next): boolean {
    return (
      next.text !== prev.text || next.style.scale !== prev.style.scale || next.style !== prev.style
    )
  },

  Component({ shape, meta, isEditing, isBinding, onShapeChange, onShapeBlur, events }, ref) {
    const rInput = React.useRef<HTMLTextAreaElement>(null)
    const { text, style } = shape
    const styles = getShapeStyle(style, meta.isDarkMode)
    const font = getFontStyle(shape.style)

    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onShapeChange?.({ ...shape, text: normalizeText(e.currentTarget.value) })
      },
      [shape]
    )

    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Escape') return

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
        e.currentTarget.setSelectionRange(0, 0)
        onShapeBlur?.()
      },
      [isEditing, shape]
    )

    const handleFocus = React.useCallback(
      (e: React.FocusEvent<HTMLTextAreaElement>) => {
        if (!isEditing) return
        if (document.activeElement === e.currentTarget) {
          e.currentTarget.select()
        }
      },
      [isEditing]
    )

    const handlePointerDown = React.useCallback(
      (e) => {
        if (isEditing) {
          e.stopPropagation()
        }
      },
      [isEditing]
    )

    React.useEffect(() => {
      if (isEditing) {
        requestAnimationFrame(() => {
          const elm = rInput.current!
          elm.focus()
          elm.select()
        })
      } else {
        const elm = rInput.current!
        elm.setSelectionRange(0, 0)
      }
    }, [isEditing])

    return (
      <HTMLContainer ref={ref} {...events}>
        <div className={wrapper({ isEditing })} onPointerDown={handlePointerDown}>
          <textarea
            className={textArea({ isEditing, isBinding })}
            ref={rInput}
            style={{
              font,
              color: styles.stroke,
            }}
            name="text"
            defaultValue={text}
            tabIndex={-1}
            autoComplete="false"
            autoCapitalize="false"
            autoCorrect="false"
            autoSave="false"
            placeholder=""
            color={styles.stroke}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPointerDown={handlePointerDown}
            autoFocus={isEditing}
            readOnly={!isEditing}
            wrap="off"
            dir="auto"
            datatype="wysiwyg"
          />
        </div>
      </HTMLContainer>
    )
  },

  Indicator() {
    return null
  },

  getBounds(shape): TLBounds {
    const ref = this.getRef(shape)
    const elm = ref.current

    const bounds = {
      minX: 0,
      minY: 0,
      maxX: elm?.offsetWidth || 32,
      maxY: elm?.offsetHeight || 32,
      width: elm?.offsetWidth || 32,
      height: elm?.offsetHeight || 32,
    }

    // const bounds = Utils.getFromCache(this.boundsCache, shape, () => {
    //   if (!melm) {
    //     // We're in SSR
    //     return { minX: 0, minY: 0, maxX: 10, maxY: 10, width: 10, height: 10 }
    //   }

    //   melm.innerHTML = `${shape.text}&zwj;`
    //   melm.style.font = getFontStyle(shape.style)

    //   // In tests, offsetWidth and offsetHeight will be 0
    //   const width = melm.offsetWidth || 1
    //   const height = melm.offsetHeight || 1

    //   return {
    //     minX: 0,
    //     maxX: width,
    //     minY: 0,
    //     maxY: height,
    //     width,
    //     height,
    //   }
    // })

    return Utils.translateBounds(bounds, shape.point)
  },

  transform(_shape, bounds, { initialShape, scaleX, scaleY }) {
    const {
      rotation = 0,
      style: { scale = 1 },
    } = initialShape

    const nextScale = scale * Math.abs(Math.min(scaleX, scaleY))

    return {
      point: [bounds.minX, bounds.minY],
      rotation:
        (scaleX < 0 && scaleY >= 0) || (scaleY < 0 && scaleX >= 0) ? -(rotation || 0) : rotation,
      style: {
        ...initialShape.style,
        scale: nextScale,
      },
    }
  },

  transformSingle(_shape, bounds, { initialShape, scaleX, scaleY }) {
    const {
      style: { scale = 1 },
    } = initialShape

    return {
      point: Vec.round([bounds.minX, bounds.minY]),
      style: {
        ...initialShape.style,
        scale: scale * Math.max(Math.abs(scaleY), Math.abs(scaleX)),
      },
    }
  },

  onDoubleClickBoundsHandle(shape) {
    const center = this.getCenter(shape)

    const newCenter = this.getCenter({
      ...shape,
      style: {
        ...shape.style,
        scale: 1,
      },
    })

    return {
      style: {
        ...shape.style,
        scale: 1,
      },
      point: Vec.round(Vec.add(shape.point, Vec.sub(center, newCenter))),
    }
  },

  onStyleChange(shape) {
    const center = this.getCenter(shape)

    this.boundsCache.delete(shape)

    const newCenter = this.getCenter(shape)

    return {
      point: Vec.round(Vec.add(shape.point, Vec.sub(center, newCenter))),
    }
  },
}))

/* -------------------------------------------------- */
/*                       Helpers                      */
/* -------------------------------------------------- */

const wrapper = css({
  width: '100%',
  height: '100%',
  variants: {
    isEditing: {
      false: {
        pointerEvents: 'all',
      },
      true: {
        pointerEvents: 'none',
      },
    },
  },
})

const textArea = css({
  position: 'absolute',
  top: 'var(--tl-padding)',
  left: 'var(--tl-padding)',
  zIndex: 1,
  width: 'calc(100% - (var(--tl-padding) * 2))',
  height: 'calc(100% - (var(--tl-padding) * 2))',
  border: 'none',
  padding: '4px',
  whiteSpace: 'pre',
  alignmentBaseline: 'mathematical',
  dominantBaseline: 'mathematical',
  resize: 'none',
  minHeight: 1,
  minWidth: 1,
  lineHeight: 1.4,
  letterSpacing: LETTER_SPACING,
  outline: 0,
  fontWeight: '500',
  overflow: 'hidden',
  backfaceVisibility: 'hidden',
  display: 'inline-block',
  WebkitUserSelect: 'text',
  WebkitTouchCallout: 'none',
  variants: {
    isBinding: {
      false: {},
      true: {
        background: '$boundsBg',
      },
    },
    isEditing: {
      false: {
        pointerEvents: 'none',
        userSelect: 'none',
        background: 'none',
        WebkitUserSelect: 'none',
      },
      true: {
        pointerEvents: 'all',
        userSelect: 'text',
        background: '$boundsBg',
        WebkitUserSelect: 'text',
      },
    },
  },
})
