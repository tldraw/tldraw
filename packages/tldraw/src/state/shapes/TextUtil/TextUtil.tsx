import { HTMLContainer, TLBounds, Utils } from '@tldraw/core'
import { Vec } from '@tldraw/vec'
import * as React from 'react'
import { stopPropagation } from '~components/stopPropagation'
import { BINDING_DISTANCE, GHOSTED_OPACITY, LETTER_SPACING } from '~constants'
import { TLDR } from '~state/TLDR'
import { TDShapeUtil } from '~state/shapes/TDShapeUtil'
import {
  TextAreaUtils,
  defaultTextStyle,
  getFontStyle,
  getShapeStyle,
  getTextAlign,
  getTextSvgElement,
} from '~state/shapes/shared'
import { styled } from '~styles'
import { AlignStyle, TDMeta, TDShapeType, TextShape, TransformInfo } from '~types'

type T = TextShape
type E = HTMLDivElement

export class TextUtil extends TDShapeUtil<T, E> {
  type = TDShapeType.Text as const

  isAspectRatioLocked = true

  canEdit = true

  canBind = true

  canClone = true

  bindingDistance = BINDING_DISTANCE / 2

  getShape = (props: Partial<T>): T => {
    return Utils.deepMerge<T>(
      {
        id: 'id',
        type: TDShapeType.Text,
        name: 'Text',
        parentId: 'page',
        childIndex: 1,
        point: [0, 0],
        rotation: 0,
        text: ' ',
        style: defaultTextStyle,
      },
      props
    )
  }

  texts = new Map<string, string>()

  Component = TDShapeUtil.Component<T, E, TDMeta>(
    ({ shape, isBinding, isGhost, isEditing, onShapeBlur, onShapeChange, meta, events }, ref) => {
      const { text, style } = shape
      const styles = getShapeStyle(style, meta.isDarkMode)
      const font = getFontStyle(shape.style)
      const rInput = React.useRef<HTMLTextAreaElement>(null)
      const rIsMounted = React.useRef(false)

      const rEditedText = React.useRef(text)

      React.useLayoutEffect(() => {
        if (text !== rEditedText.current) {
          let delta = [0, 0]
          this.texts.set(shape.id, text)
          const currentBounds = this.getBounds(shape)
          const nextBounds = this.getBounds(shape)
          switch (shape.style.textAlign) {
            case AlignStyle.Start: {
              break
            }
            case AlignStyle.Middle: {
              delta = Vec.div([nextBounds.width - currentBounds.width, 0], 2)
              break
            }
            case AlignStyle.End: {
              delta = [nextBounds.width - currentBounds.width, 0]
              break
            }
          }

          rEditedText.current = text

          onShapeChange?.({
            ...shape,
            id: shape.id,
            point: Vec.sub(shape.point, delta),
            text,
          })
        }
      }, [text])

      const handleChange = React.useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
          let delta = [0, 0]
          const newText = TLDR.normalizeText(e.currentTarget.value)
          const currentBounds = this.getBounds(shape)
          this.texts.set(shape.id, newText)
          const nextBounds = this.getBounds({
            ...shape,
            text: newText,
          })

          switch (shape.style.textAlign) {
            case AlignStyle.Start: {
              break
            }
            case AlignStyle.Middle: {
              delta = Vec.div([nextBounds.width - currentBounds.width, 0], 2)
              break
            }
            case AlignStyle.End: {
              delta = [nextBounds.width - currentBounds.width, 0]
              break
            }
          }

          rEditedText.current = newText

          onShapeChange?.({
            ...shape,
            id: shape.id,
            point: Vec.sub(shape.point, delta),
            text: newText,
          })
        },
        [shape.id, shape.point]
      )

      const handleKeyDown = React.useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            e.stopPropagation()
            onShapeBlur?.()
            return
          }

          if (e.key === 'Tab' && shape.text.length === 0) {
            e.preventDefault()
            return
          }

          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            e.stopPropagation()
            rInput.current!.blur()
            return
          }

          if (!(e.key === 'Meta' || e.metaKey)) {
            e.stopPropagation()
          } else if (e.key === 'z' && e.metaKey) {
            if (e.shiftKey) {
              document.execCommand('redo', false)
            } else {
              document.execCommand('undo', false)
            }
            e.stopPropagation()
            e.preventDefault()
            return
          }
          if ((e.metaKey || e.ctrlKey) && e.key === '=') {
            e.preventDefault()
          }
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
          if (document.activeElement === e.currentTarget) {
            e.currentTarget.select()
          }
        },
        [isEditing]
      )

      const handlePointerDown = React.useCallback(
        (e: React.PointerEvent<HTMLDivElement | HTMLTextAreaElement>) => {
          if (isEditing) {
            e.stopPropagation()
          }
        },
        [isEditing]
      )

      React.useEffect(() => {
        if (isEditing) {
          this.texts.set(shape.id, text)
          requestAnimationFrame(() => {
            rIsMounted.current = true
            const elm = rInput.current
            if (elm) {
              elm.focus()
              elm.select()
            }
          })
        } else {
          onShapeBlur?.()
        }
      }, [isEditing])

      return (
        <HTMLContainer ref={ref} {...events}>
          <Wrapper isGhost={isGhost} isEditing={isEditing} onPointerDown={handlePointerDown}>
            <InnerWrapper
              style={{
                font,
                color: styles.stroke,
                textAlign: getTextAlign(style.textAlign),
              }}
            >
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
              {isEditing ? (
                <TextArea
                  ref={rInput}
                  style={{
                    font,
                    color: styles.stroke,
                  }}
                  name="text"
                  tabIndex={-1}
                  autoComplete="false"
                  autoCapitalize="false"
                  autoCorrect="false"
                  autoSave="false"
                  autoFocus
                  placeholder=""
                  spellCheck="true"
                  wrap="off"
                  dir="auto"
                  datatype="wysiwyg"
                  defaultValue={text}
                  color={styles.stroke}
                  onFocus={handleFocus}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  onBlur={handleBlur}
                  onPointerDown={handlePointerDown}
                  onContextMenu={stopPropagation}
                  onCopy={stopPropagation}
                  onPaste={stopPropagation}
                  onCut={stopPropagation}
                />
              ) : (
                text
              )}
              &#8203;
            </InnerWrapper>
          </Wrapper>
        </HTMLContainer>
      )
    }
  )

  Indicator = TDShapeUtil.Indicator<T>(({ shape }) => {
    const { width, height } = this.getBounds(shape)
    return <rect x={0} y={0} width={width} height={height} />
  })

  getBounds = (shape: T) => {
    const bounds = Utils.getFromCache(this.boundsCache, shape, () => {
      if (!melm) {
        // We're in SSR
        return { minX: 0, minY: 0, maxX: 10, maxY: 10, width: 10, height: 10 }
      }

      if (!melm.parentNode) document.body.appendChild(melm)

      melm.style.font = getFontStyle(shape.style)
      melm.textContent = this.texts.get(shape.id) ?? shape.text

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
    { initialShape, scaleX, scaleY }: TransformInfo<T>
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
    { initialShape, scaleX, scaleY }: TransformInfo<T>
  ): Partial<T> | void => {
    const {
      style: { scale = 1 },
    } = initialShape

    return {
      point: Vec.toFixed([bounds.minX, bounds.minY]),
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
      point: Vec.toFixed(Vec.add(shape.point, Vec.sub(center, newCenter))),
    }
  }

  getSvgElement = (shape: T, isDarkMode: boolean): SVGElement | void => {
    const bounds = this.getBounds(shape)
    const style = getShapeStyle(shape.style, isDarkMode)
    const elm = getTextSvgElement(shape.text, shape.style, bounds)
    elm.setAttribute('fill', style.stroke)

    return elm
  }
}

/* -------------------------------------------------- */
/*                       Helpers                      */
/* -------------------------------------------------- */

let melm: any

function getMeasurementDiv() {
  // A div used for measurement
  document.getElementById('__textMeasure')?.remove()

  const pre = document.createElement('pre')
  pre.id = '__textMeasure'

  Object.assign(pre.style, {
    whiteSpace: 'pre',
    width: 'auto',
    border: '1px solid transparent',
    padding: '4px',
    margin: '0px',
    letterSpacing: LETTER_SPACING,
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
    isGhost: {
      false: { opacity: 1 },
      true: { transition: 'opacity .2s', opacity: GHOSTED_OPACITY },
    },
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

const commonTextWrapping = {
  whiteSpace: 'pre-wrap',
  overflowWrap: 'break-word',
}

const InnerWrapper = styled('div', {
  position: 'absolute',
  width: '100%',
  height: '100%',
  padding: '4px',
  zIndex: 1,
  minHeight: 1,
  minWidth: 1,
  lineHeight: 1,
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
  ...commonTextWrapping,
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
  resize: 'none',
  textAlign: 'inherit',
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
  ...commonTextWrapping,
  '&:focus': {
    outline: 'none',
    border: 'none',
  },
})
