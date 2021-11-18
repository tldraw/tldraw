import type { TLPage, TLPageState, TLPointerEventHandler, TLShapeChangeHandler } from '@tldraw/core'
import Vec from '@tldraw/vec'
import * as React from 'react'
import type { Shape } from '../shapes'

export function useAppState() {
  /* -------------------- Document -------------------- */

  const [page, setPage] = React.useState<TLPage<Shape>>({
    id: 'page1',
    shapes: {
      box1: {
        id: 'box1',
        type: 'box',
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
    id: 'page1',
    selectedIds: [],
    hoveredId: undefined,
    camera: {
      point: [0, 0],
      zoom: 1,
    },
  })

  const [meta] = React.useState({
    isDarkMode: false,
  })

  /* ---------------------- Theme --------------------- */

  const theme = React.useMemo(
    () =>
      meta.isDarkMode
        ? {
            accent: 'rgb(255, 0, 0)',
            brushFill: 'rgba(0,0,0,.05)',
            brushStroke: 'rgba(0,0,0,.25)',
            selectStroke: 'rgb(66, 133, 244)',
            selectFill: 'rgba(65, 132, 244, 0.05)',
            background: 'rgb(248, 249, 250)',
            foreground: 'rgb(51, 51, 51)',
          }
        : {
            accent: 'rgb(255, 0, 0)',
            brushFill: 'rgba(0,0,0,.05)',
            brushStroke: 'rgba(0,0,0,.25)',
            selectStroke: 'rgb(66, 133, 244)',
            selectFill: 'rgba(65, 132, 244, 0.05)',
            background: 'rgb(248, 249, 250)',
            foreground: 'rgb(51, 51, 51)',
          },
    [meta]
  )

  /* --------------------- Events --------------------- */

  const onHoverShape = React.useCallback<TLPointerEventHandler>((e) => {
    setPageState((pageState) => {
      return {
        ...pageState,
        hoveredId: e.target,
      }
    })
  }, [])

  const onUnhoverShape = React.useCallback<TLPointerEventHandler>(() => {
    setPageState((pageState) => {
      return {
        ...pageState,
        hoveredId: undefined,
      }
    })
  }, [])

  const onPointShape = React.useCallback<TLPointerEventHandler>((e) => {
    setPageState((pageState) => {
      return pageState.selectedIds.includes(e.target)
        ? pageState
        : {
            ...pageState,
            selectedIds: [e.target],
          }
    })
  }, [])

  const onPointCanvas = React.useCallback<TLPointerEventHandler>((e) => {
    setPageState((pageState) => {
      return {
        ...pageState,
        selectedIds: [],
      }
    })
  }, [])

  const onDragShape = React.useCallback<TLPointerEventHandler>(
    (e) => {
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
    },
    [setPage]
  )

  const onShapeChange = React.useCallback<TLShapeChangeHandler<Shape>>((changes) => {
    setPage((page) => {
      const shape = page.shapes[changes.id]

      return {
        ...page,
        shapes: {
          ...page.shapes,
          [shape.id]: {
            ...shape,
            ...changes,
          } as Shape,
        },
      }
    })
  }, [])

  return {
    page,
    pageState,
    meta,
    theme,
    events: {
      onHoverShape,
      onUnhoverShape,
      onPointShape,
      onDragShape,
      onPointCanvas,
      onShapeChange,
    },
  }
}
