/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { Utils, HTMLContainer, TLBounds } from '@tldraw/core'
import { defaultStyle, getShapeStyle, getFontStyle } from '../shape-styles'
import { TextShape, TLDrawMeta, TLDrawShapeType, TLDrawTransformInfo } from '~types'
import { TextAreaUtils } from '../shared'
import { BINDING_DISTANCE } from '~constants'
import { TLDrawShapeUtil } from '../TLDrawShapeUtil'
import { styled } from '~styles'
import Vec from '@tldraw/vec'

type T = TextShape
type E = HTMLDivElement

export class TextUtil extends TLDrawShapeUtil<T, E> {
  type = TLDrawShapeType.Text as const

  isAspectRatioLocked = true

  canEdit = true

  canBind = true

  getShape = (props: Partial<T>): T => {
    return Utils.deepMerge<T>(
      {
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
      props
    )
  }

  Component = TLDrawShapeUtil.Component<T, E, TLDrawMeta>(
    ({ shape, isBinding, isEditing, onShapeBlur, onShapeChange, meta, events }, ref) => {
      const rInput = React.useRef<HTMLTextAreaElement>(null)
      const { text, style } = shape
      const styles = getShapeStyle(style, meta.isDarkMode)
      const font = getFontStyle(shape.style)

      const rIsMounted = React.useRef(false)

      const handleChange = React.useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
          onShapeChange?.({ ...shape, text: normalizeText(e.currentTarget.value) })
        },
        [shape]
      )

      const handleKeyDown = React.useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
          e.stopPropagation()

          if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
            e.currentTarget.blur()
            return
          }

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
            rIsMounted.current = true
            const elm = rInput.current!
            elm.focus()
            elm.select()
          })
        }
      }, [isEditing])

      return (
        <HTMLContainer ref={ref} {...events}>
          <Wrapper isEditing={isEditing} onPointerDown={handlePointerDown}>
            <InnerWrapper
              style={{
                font,
                color: styles.stroke,
              }}
            >
              {isBinding && (
                <div
                  className="tl-binding-indicator"
                  style={{
                    position: 'absolute',
                    top: -BINDING_DISTANCE,
                    left: -BINDING_DISTANCE,
                    width: `calc(100% + ${BINDING_DISTANCE * 2}px)`,
                    height: `calc(100% + ${BINDING_DISTANCE * 2}px)`,
                    backgroundColor: 'var(--tl-selectFill)',
                  }}
                />
              )}
              {isEditing ? (
                <TextArea
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
                  autoFocus
                  wrap="off"
                  dir="auto"
                  datatype="wysiwyg"
                />
              ) : (
                text
              )}
            </InnerWrapper>
          </Wrapper>
        </HTMLContainer>
      )
    }
  )

  Indicator = TLDrawShapeUtil.Indicator<T>(({ shape }) => {
    const { width, height } = this.getBounds(shape)
    return <rect x={0} y={0} width={width} height={height} />
  })

  getBounds = (shape: T) => {
    const bounds = Utils.getFromCache(this.boundsCache, shape, () => {
      if (!melm) {
        // We're in SSR
        return { minX: 0, minY: 0, maxX: 10, maxY: 10, width: 10, height: 10 }
      }

      melm.innerHTML = `${shape.text}&zwj;`
      melm.style.font = getFontStyle(shape.style)

      // In tests, offsetWidth and offsetHeight will be 0
      const width = melm.offsetWidth || 1
      const height = melm.offsetHeight || 1

      return {
        minX: 0,
        maxX: width,
        minY: 0,
        maxY: height,
        width,
        height,
      }
    })

    return Utils.translateBounds(bounds, shape.point)
  }

  shouldRender = (prev: T, next: T): boolean => {
    return (
      next.text !== prev.text || next.style.scale !== prev.style.scale || next.style !== prev.style
    )
  }

  transform = (
    shape: T,
    bounds: TLBounds,
    { initialShape, scaleX, scaleY }: TLDrawTransformInfo<T>
  ): Partial<T> => {
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
  }

  transformSingle = (
    shape: T,
    bounds: TLBounds,
    { initialShape, scaleX, scaleY }: TLDrawTransformInfo<T>
  ): Partial<T> | void => {
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
  }

  onDoubleClickBoundsHandle = (shape: T) => {
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
  }
}

/* -------------------------------------------------- */
/*                       Helpers                      */
/* -------------------------------------------------- */

const LETTER_SPACING = -1.5

function normalizeText(text: string) {
  return text.replace(/\r?\n|\r/g, '\n')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let melm: any

function getMeasurementDiv() {
  // A div used for measurement
  document.getElementById('__textMeasure')?.remove()

  const pre = document.createElement('pre')
  pre.id = '__textMeasure'

  Object.assign(pre.style, {
    whiteSpace: 'pre',
    width: 'auto',
    border: '1px solid red',
    padding: '4px',
    margin: '0px',
    letterSpacing: `${LETTER_SPACING}px`,
    opacity: '0',
    position: 'absolute',
    top: '-500px',
    left: '0px',
    zIndex: '9999',
    pointerEvents: 'none',
    userSelect: 'none',
    alignmentBaseline: 'mathematical',
    dominantBaseline: 'mathematical',
  })

  pre.tabIndex = -1

  document.body.appendChild(pre)
  return pre
}

if (typeof window !== 'undefined') {
  melm = getMeasurementDiv()
}

const Wrapper = styled('div', {
  width: '100%',
  height: '100%',
  variants: {
    isEditing: {
      false: {
        pointerEvents: 'all',
        userSelect: 'all',
      },
      true: {
        pointerEvents: 'none',
        userSelect: 'none',
      },
    },
  },
})

const InnerWrapper = styled('div', {
  position: 'absolute',
  top: 'var(--tl-padding)',
  left: 'var(--tl-padding)',
  width: 'calc(100% - (var(--tl-padding) * 2))',
  height: 'calc(100% - (var(--tl-padding) * 2))',
  padding: '4px',
  zIndex: 1,
  minHeight: 1,
  minWidth: 1,
  lineHeight: 1.4,
  letterSpacing: LETTER_SPACING,
  outline: 0,
  fontWeight: '500',
  backfaceVisibility: 'hidden',
  userSelect: 'none',
  pointerEvents: 'none',
  WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none',
  isEditing: {
    false: {},
    true: {
      pointerEvents: 'all',
      background: '$boundsBg',
      userSelect: 'text',
      WebkitUserSelect: 'text',
    },
  },
})

const TextArea = styled('textarea', {
  position: 'absolute',
  top: 0,
  left: 0,
  zIndex: 1,
  width: '100%',
  height: '100%',
  border: 'none',
  padding: '4px',
  whiteSpace: 'pre',
  resize: 'none',
  minHeight: 'inherit',
  minWidth: 'inherit',
  lineHeight: 'inherit',
  letterSpacing: 'inherit',
  outline: 0,
  fontWeight: 'inherit',
  overflow: 'hidden',
  backfaceVisibility: 'hidden',
  display: 'inline-block',
  pointerEvents: 'all',
  background: '$boundsBg',
  userSelect: 'text',
  WebkitUserSelect: 'text',
})
