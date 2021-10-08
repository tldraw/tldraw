import * as React from 'react'
import { HTMLContainer, ShapeUtil } from '@tldraw/core'
import { defaultStyle } from '~shape/shape-styles'
import { StickyShape, TLDrawMeta, TLDrawShapeType, TLDrawToolType } from '~types'
import { getBoundsRectangle, transformRectangle, transformSingleRectangle } from '../shared'
import { css } from '@stitches/core'
import { getStickyFontStyle, getStickyShapeStyle } from '~shape'

export const Sticky = new ShapeUtil<StickyShape, HTMLDivElement, TLDrawMeta>(() => ({
  type: TLDrawShapeType.Sticky,

  isStateful: true,

  toolType: TLDrawToolType.Bounds,

  canBind: true,

  pathCache: new WeakMap<number[], string>([]),

  defaultProps: {
    id: 'id',
    type: TLDrawShapeType.Sticky,
    name: 'Sticky',
    parentId: 'page',
    childIndex: 1,
    point: [0, 0],
    size: [1, 1],
    text: 'Hello World',
    rotation: 0,
    style: defaultStyle,
  },

  shouldRender(prev, next) {
    return next.size !== prev.size || next.style !== prev.style || next.text !== prev.text
  },

  Component({ events, shape, onShapeChange }, ref) {
    const font = getStickyFontStyle(shape.style)
    const style = getStickyShapeStyle(shape.style)

    return (
      <HTMLContainer ref={ref} {...events}>
        <div className={styledStickyContainer()} style={{ backgroundColor: style.fill }}>
          <textarea
            className={styledStickyText()}
            style={{ font, color: style.color }}
            onPointerDown={(e) => e.stopPropagation()}
            value={shape.text}
            onChange={(e) =>
              onShapeChange?.({ id: shape.id, type: shape.type, text: e.currentTarget.value })
            }
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
  padding: '16px',
  borderRadius: '3px',
  perspective: '800px',
  boxShadow: '2px 3px 8px -2px rgba(0,0,0,.3), 1px 2px 2px rgba(0,0,0,.1)',
})

const styledStickyText = css({
  width: '100%',
  height: '100%',
  border: 'none',
  background: 'none',
  outline: 'none',
  textAlign: 'left',
  font: 'inherit',
  verticalAlign: 'top',
  resize: 'none',
})
