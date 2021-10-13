import * as React from 'react'
import { HTMLContainer, ShapeUtil } from '@tldraw/core'
import { defaultStyle, getShapeStyle } from '~shape/shape-styles'
import { PostItShape, TLDrawMeta, TLDrawShapeType } from '~types'
import { getBoundsRectangle, transformRectangle, transformSingleRectangle } from '../shared'

export const PostIt = new ShapeUtil<PostItShape, HTMLDivElement, TLDrawMeta>(() => ({
  type: TLDrawShapeType.PostIt,

  canBind: true,

  pathCache: new WeakMap<number[], string>([]),

  defaultProps: {
    id: 'id',
    type: TLDrawShapeType.PostIt,
    name: 'PostIt',
    parentId: 'page',
    childIndex: 1,
    point: [0, 0],
    size: [1, 1],
    text: '',
    rotation: 0,
    style: defaultStyle,
  },

  shouldRender(prev, next) {
    return next.size !== prev.size || next.style !== prev.style
  },

  Component({ events }, ref) {
    const [count, setCount] = React.useState(0)

    return (
      <HTMLContainer ref={ref} {...events}>
        <div
          style={{
            pointerEvents: 'all',
            backgroundColor: 'rgba(255, 220, 100)',
            border: '1px solid black',
            fontFamily: 'sans-serif',
            height: '100%',
            width: '100%',
          }}
        >
          <div onPointerDown={(e) => e.preventDefault()}>
            <input
              type="textarea"
              style={{ width: '100%', height: '50%', background: 'none' }}
              onPointerDown={(e) => e.stopPropagation()}
            />
            <button onPointerDown={() => setCount((count) => count + 1)}>{count}</button>
          </div>
        </div>
      </HTMLContainer>
    )
  },

  Indicator({ shape }) {
    const {
      style,
      size: [width, height],
    } = shape

    const styles = getShapeStyle(style, false)
    const strokeWidth = +styles.strokeWidth

    const sw = strokeWidth

    return (
      <rect
        x={sw / 2}
        y={sw / 2}
        rx={1}
        ry={1}
        width={Math.max(1, width - sw)}
        height={Math.max(1, height - sw)}
      />
    )
  },

  getBounds(shape) {
    return getBoundsRectangle(shape, this.boundsCache)
  },

  transform: transformRectangle,

  transformSingle: transformSingleRectangle,
}))
