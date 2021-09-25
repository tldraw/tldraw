/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* refresh-reset */

import * as React from 'react'
import { TLShape, Utils, TLBounds, ShapeUtil, HTMLContainer } from '@tldraw/core'

// Define a custom shape

export interface ArticleShape extends TLShape {
  type: 'rectangle'
  size: number[]
  text: string
}

// Create a "shape utility" class that interprets that shape

export const Article = new ShapeUtil<ArticleShape, HTMLDivElement, { isDarkMode: boolean }>(() => ({
  type: 'rectangle',
  defaultProps: {
    id: 'example1',
    type: 'rectangle',
    parentId: 'page1',
    childIndex: 0,
    name: 'Example Shape',
    point: [0, 0],
    size: [100, 100],
    rotation: 0,
    text: 'Hello world!',
  },
  Component({ shape, events, meta, onShapeChange, isEditing }, ref) {
    const color = meta.isDarkMode ? 'white' : 'black'

    const rInput = React.useRef<HTMLDivElement>(null)

    function updateShapeSize() {
      const elm = rInput.current!

      onShapeChange?.({
        ...shape,
        text: elm.innerText,
        size: [elm.offsetWidth + 44, elm.offsetHeight + 44],
      })
    }

    React.useLayoutEffect(() => {
      const elm = rInput.current!

      const observer = new MutationObserver(updateShapeSize)

      observer.observe(elm, {
        attributes: true,
        characterData: true,
        subtree: true,
      })

      elm.innerText = shape.text
      updateShapeSize()

      return () => {
        observer.disconnect()
      }
    }, [])

    React.useEffect(() => {
      if (isEditing) {
        rInput.current!.focus()
      }
    }, [isEditing])

    return (
      <HTMLContainer ref={ref}>
        <div
          {...events}
          style={{
            pointerEvents: 'all',
            width: shape.size[0],
            height: shape.size[1],
            display: 'flex',
            fontSize: 20,
            fontFamily: 'sans-serif',
            alignItems: 'center',
            justifyContent: 'center',
            border: `2px solid ${color}`,
            color,
          }}
        >
          <div onPointerDown={(e) => isEditing && e.stopPropagation()}>
            <div
              ref={rInput}
              style={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textAlign: 'center',
                outline: 'none',
                userSelect: isEditing ? 'all' : 'none',
              }}
              contentEditable={isEditing}
            />
          </div>
        </div>
      </HTMLContainer>
    )
  },
  Indicator({ shape }) {
    return (
      <rect
        fill="none"
        stroke="blue"
        strokeWidth={1}
        width={shape.size[0]}
        height={shape.size[1]}
        pointerEvents="none"
      />
    )
  },
  getBounds(shape) {
    const bounds = Utils.getFromCache(this.boundsCache, shape, () => {
      const [width, height] = shape.size
      return {
        minX: 0,
        maxX: width,
        minY: 0,
        maxY: height,
        width,
        height,
      } as TLBounds
    })

    return Utils.translateBounds(bounds, shape.point)
  },
}))
