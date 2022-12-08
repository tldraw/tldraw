import { HTMLContainer, TLBounds, Utils } from '@tldraw/core'
import { Vec } from '@tldraw/vec'
import * as React from 'react'
import { stopPropagation } from '~components/stopPropagation'
import { GHOSTED_OPACITY, LETTER_SPACING } from '~constants'
import { useTldrawApp } from '~hooks'
import { TLDR } from '~state/TLDR'
import { TDShapeUtil } from '~state/shapes/TDShapeUtil'
import {
  TextAreaUtils,
  defaultTextStyle,
  getBoundsRectangle,
  getFontFace,
  getStickyFontSize,
  getStickyFontStyle,
  getStickyShapeStyle,
  getTextSvgElement,
} from '~state/shapes/shared'
import { styled } from '~styles'
import { AlignStyle, TDMeta, TDShapeType, TemplateShape, TransformInfo } from '~types'

type T = TemplateShape
type E = HTMLDivElement

export class TemplateUtil extends TDShapeUtil<T, E> {
  type = TDShapeType.Template as const

  canBind = true

  canEdit = true

  canClone = true

  hideResizeHandles = true

  showCloneHandles = true

  getShape = (props: Partial<T>): T => {
    return Utils.deepMerge<T>(
      {
        id: 'id',
        type: TDShapeType.Template,
        name: 'Template',
        parentId: 'page',
        childIndex: 1,
        point: [0, 0],
        size: [720, 720],
        text: '',
        rotation: 0,
        style: defaultTextStyle,
      },
      props
    )
  }

  Component = TDShapeUtil.Component<T, E, TDMeta>(
    ({ shape, meta, events, isGhost, isEditing }, ref) => {
      const font = getStickyFontStyle(shape.style)

      const { color } = getStickyShapeStyle(shape.style, meta.isDarkMode)

      const rContainer = React.useRef<HTMLDivElement>(null)

      const style = {
        font,
        color,
        textShadow: meta.isDarkMode
          ? `0.5px 0.5px 2px rgba(255, 255, 255,.25)`
          : `0.5px 0.5px 2px rgba(255, 255, 255,.5)`,
      }

      const [test, setTest] = React.useState(true)
      const app = useTldrawApp()

      const rIsMounted = React.useRef(false)

      const handlePointerDown = React.useCallback(
        (e: React.PointerEvent<HTMLDivElement | HTMLTextAreaElement>) => {
          if (isEditing) {
            e.stopPropagation()
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

      // console.log('onShapeChange>>', onShapeChange)
      // const handleDelete = () => {
      //   app.delete([shape.id])
      //   console.log('shape>>', shape.id)
      // }

      const rWasEditing = React.useRef(isEditing)

      React.useEffect(() => {
        if (isEditing) {
          rWasEditing.current = true
          requestAnimationFrame(() => {
            rIsMounted.current = true
          })
        } else if (rWasEditing.current) {
          rWasEditing.current = false
        }
      }, [isEditing])

      // const handleDelete = React.useCallback(() => {
      //   app.delete([shape.id])
      //   console.log('shape>>', [shape.id])
      // }, [app])
      const handleDelete = () => {
        app.delete([shape.id])
      }

      return (
        <>
          {test && (
            <>
              <HTMLContainer ref={ref} {...events} shape={TDShapeType.Template}>
                <div
                  style={{
                    position: 'absolute',
                    top: '0px',
                    left: '0px',
                    width: '100%',
                    height: '2rem',
                    backgroundColor: '#aaa',
                    zIndex: 1,
                  }}
                >
                  TEST
                  <button
                    type="button"
                    onClick={() => {
                      console.log('Click Click !!!')
                    }}
                  >
                    test
                  </button>
                </div>
                <StyledStickyContainer
                  ref={rContainer}
                  isDarkMode={meta.isDarkMode}
                  isGhost={isGhost}
                  style={{ ...style }}
                  onPointerDown={handlePointerDown}
                >
                  {/* <div onPointerDown={handlePointerDown}> */}
                  <button type="button" onClick={handleDelete} onSelect={() => handleFocus}>
                    닫기
                  </button>
                  {/* </div> */}
                  <span>testeee</span>
                </StyledStickyContainer>
              </HTMLContainer>
            </>
          )}
        </>
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
  /* 
  shouldRender = (prev: T, next: T) => {
    return next.size !== prev.size || next.style !== prev.style || next.text !== prev.text
  } */
  /* 
  transform = (
    shape: T,
    bounds: TLBounds,
    { scaleX, scaleY, transformOrigin }: TransformInfo<T>
  ): Partial<T> => {
    const point = Vec.toFixed([
      bounds.minX +
        (bounds.width - shape.size[0]) * (scaleX < 0 ? 1 - transformOrigin[0] : transformOrigin[0]),
      bounds.minY +
        (bounds.height - shape.size[1]) *
          (scaleY < 0 ? 1 - transformOrigin[1] : transformOrigin[1]),
    ])

    return {
      point,
    }
  } */
  /* 
  transformSingle = (shape: T): Partial<T> => {
    return shape
  } */
  /* 
  getSvgElement = (shape: T, isDarkMode: boolean): SVGElement | void => {
    const bounds = this.getBounds(shape)

    const style = getStickyShapeStyle(shape.style, isDarkMode)

    const fontSize = getStickyFontSize(shape.style.size) * (shape.style.scale ?? 1)
    const fontFamily = getFontFace(shape.style.font).slice(1, -1)
    const textAlign = shape.style.textAlign ?? AlignStyle.Start

    const textElm = getTextSvgElement(
      shape.text,
      fontSize,
      fontFamily,
      textAlign,
      bounds.width - PADDING * 2,
      true
    )

    textElm.setAttribute('fill', style.color)
    textElm.setAttribute('transform', `translate(${PADDING}, ${PADDING})`)

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('width', bounds.width + '')
    rect.setAttribute('height', bounds.height + '')
    rect.setAttribute('fill', style.fill)
    rect.setAttribute('rx', '3')
    rect.setAttribute('ry', '3')

    g.appendChild(rect)
    g.appendChild(textElm)

    return g
  } */
}

/* -------------------------------------------------- */
/*                       Helpers                      */
/* -------------------------------------------------- */

const PADDING = 16

const StyledStickyContainer = styled('div', {
  pointerEvents: 'all',
  position: 'relative',
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
