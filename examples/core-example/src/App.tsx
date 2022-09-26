import { Renderer, TLBinding, TLPage, TLPageState, TLPointerEventHandler } from '@tldraw/core'
import Vec from '@tldraw/vec'
import * as React from 'react'
import { RectUtil, Shape } from './shapes'

const shapeUtils = {
  rect: new RectUtil(),
}

export default function App() {
  const [page, setPage] = React.useState<TLPage<Shape, TLBinding>>({
    id: 'page1',
    shapes: {
      box1: {
        id: 'box1',
        type: 'rect',
        parentId: 'page1',
        name: 'Box',
        childIndex: 1,
        rotation: 0,
        point: [0, 0],
        size: [100, 100],
      },
    },
    bindings: {},
  })

  const [pageState, setPageState] = React.useState<TLPageState>({
    id: 'page',
    selectedIds: [],
    hoveredId: undefined,
    camera: {
      point: [0, 0],
      zoom: 1,
    },
  })
  const onHoverShape: TLPointerEventHandler = (e) => {
    setPageState({
      ...pageState,
      hoveredId: e.target,
    })
  }

  const onUnhoverShape: TLPointerEventHandler = () => {
    setPageState({
      ...pageState,
      hoveredId: null,
    })
  }

  const onPointShape: TLPointerEventHandler = (info) => {
    setPageState({ ...pageState, selectedIds: [info.target] })
  }

  const onPointCanvas: TLPointerEventHandler = () => {
    setPageState({ ...pageState, selectedIds: [] })
  }

  const onDragShape: TLPointerEventHandler = (e) => {
    setPage((page) => {
      const shape = page.shapes[e.target]

      return {
        ...page,
        shapes: {
          ...page.shapes,
          [shape.id]: {
            ...shape,
            point: Vec.sub(e.point, Vec.div(shape.size, 2)),
          },
        },
      }
    })
  }

  const onPointerMove: TLPointerEventHandler = (info) => {
    if (info.shiftKey) {
      setPageState((prev) => ({
        ...pageState,
        camera: {
          ...prev.camera,
          point: Vec.add(prev.camera.point, info.delta),
        },
      }))
    }
  }

  const [meta] = React.useState({
    isDarkMode: false,
  })

  const theme = React.useMemo(
    () =>
      meta.isDarkMode
        ? {
            accent: 'rgb(255, 0, 0)',
            brushFill: 'rgba(0,0,0,.05)',
            brushStroke: 'rgba(0,0,0,.25)',
            brushDashStroke: 'rgba(0,0,0,.6)',
            selectStroke: 'rgb(66, 133, 244)',
            selectFill: 'rgba(65, 132, 244, 0.05)',
            background: 'rgb(248, 249, 250)',
            foreground: 'rgb(51, 51, 51)',
          }
        : {
            accent: 'rgb(255, 0, 0)',
            brushFill: 'rgba(0,0,0,.05)',
            brushStroke: 'rgba(0,0,0,.25)',
            brushDashStroke: 'rgba(0,0,0,.6)',
            selectStroke: 'rgb(66, 133, 244)',
            selectFill: 'rgba(65, 132, 244, 0.05)',
            background: 'rgb(248, 249, 250)',
            foreground: 'rgb(51, 51, 51)',
          },
    [meta]
  )

  return (
    <div className="tldraw">
      <Renderer
        shapeUtils={shapeUtils} // Required
        page={page} // Required
        pageState={pageState} // Required
        onHoverShape={onHoverShape}
        onUnhoverShape={onUnhoverShape}
        onPointShape={onPointShape}
        onPointCanvas={onPointCanvas}
        onPointerMove={onPointerMove}
        onDragShape={onDragShape}
        meta={meta}
        theme={theme}
        id={undefined}
        containerRef={undefined}
        hideBounds={false}
        hideIndicators={false}
        hideHandles={false}
        hideCloneHandles={false}
        hideBindingHandles={false}
        hideRotateHandles={false}
        userId={undefined}
        users={undefined}
        snapLines={undefined}
        onBoundsChange={undefined}
      />
    </div>
  )
}
