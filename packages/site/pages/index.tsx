import * as React from 'react'
import { TLDocument } from '@tldraw/core'
import { Tldraw, BaseShapes } from '@tldraw/tldraw'

export function Index() {
  const [document, setDocument] = React.useState<TLDocument<BaseShapes>>({
    currentPageId: 'page1',
    pages: {
      page1: {
        id: 'page1',
        shapes: {
          rect1: {
            id: 'rect1',
            parentId: 'page1',
            name: 'Rectangle',
            childIndex: 0,
            type: 'rectangle',
            point: [0, 0],
            size: [100, 100],
            rotation: 0,
          },
          rect2: {
            id: 'rect2',
            parentId: 'page1',
            name: 'Rectangle',
            childIndex: 0,
            type: 'rectangle',
            point: [200, 200],
            size: [100, 100],
            rotation: 0,
          },
        },
        bindings: {},
      },
    },
    pageStates: {
      page1: {
        id: 'page1',
        selectedIds: [],
        camera: {
          point: [0, 0],
          zoom: 1,
        },
      },
    },
  })

  return (
    <Tldraw
      document={document}
      onMount={(tlstate) => {
        console.log(tlstate)
      }}
    />
  )
}

export default Index
