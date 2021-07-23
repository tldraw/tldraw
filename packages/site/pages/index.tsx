import * as React from 'react'
import { TLPage, TLPageState } from '@tldraw/core'
import { BaseShapes } from '@tldraw/tldraw'
import dynamic from 'next/dynamic'
const Tldraw = dynamic(
  async () => {
    const tl = await import('@tldraw/tldraw')
    return tl.Tldraw
  },
  {
    ssr: false,
  }
)

export function Index() {
  const [page, setPage] = React.useState<TLPage<BaseShapes>>({
    id: 'page',
    shapes: {
      rect1: {
        id: 'rect1',
        parentId: 'page',
        name: 'Rectangle',
        childIndex: 0,
        type: 'rectangle',
        point: [0, 0],
        size: [100, 100],
        rotation: 0,
      },
      rect2: {
        id: 'rect2',
        parentId: 'page',
        name: 'Rectangle',
        childIndex: 0,
        type: 'rectangle',
        point: [200, 200],
        size: [100, 100],
        rotation: 0,
      },
    },
    bindings: {},
  })

  const [pageState, setPageState] = React.useState<TLPageState>({
    id: 'page',
    selectedIds: [],
    camera: {
      point: [0, 0],
      zoom: 1,
    },
  })

  return (
    <Tldraw
      page={page}
      pageState={pageState}
      onMount={(tlstate) => {
        console.log(tlstate)
      }}
    />
  )
}

export default Index
