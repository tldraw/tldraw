import { CursorComponent, Renderer, TLPage, TLShape } from '@tldraw/core'
import * as React from 'react'
import { shapeUtils } from './core-stuff'

// A custom cursor component.
const CustomCursor: CursorComponent<{ name: 'Steve' }> = ({ color, metadata }) => {
  return (
    <div style={{ display: 'flex', width: 'fit-content', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          width: 12,
          height: 12,
          background: color,
          borderRadius: '100%',
        }}
      />
      <div style={{ background: 'white', padding: '4px 8px', borderRadius: 4 }}>
        {metadata!.name}
      </div>
    </div>
  )
}

// Component overrides for the tldraw renderer
const components = {
  Cursor: CustomCursor,
}

export default function CustomCursorsExample() {
  return (
    <div className="tldraw">
      <Renderer
        users={{
          user1: {
            id: 'user1',
            point: [100, 100],
            color: 'red',
            selectedIds: [],
            metadata: { name: 'Steve' }, // <-- our custom metadata
          },
        }}
        components={components} // <-- with custom cursor component
        shapeUtils={shapeUtils}
        page={
          {
            id: 'page',
            shapes: {
              a: {
                id: 'a',
                name: 'A',
                type: 'basic',
                parentId: 'page',
                childIndex: 1,
                point: [0, 0],
                size: [100, 100],
              },
            },
            bindings: {},
          } as TLPage<TLShape>
        }
        pageState={{
          id: 'page',
          camera: { point: [0, 0], zoom: 1 },
          selectedIds: [],
          hoveredId: null,
        }}
      />
    </div>
  )
}
