import { Renderer, TLPointerEventHandler, TLShapeUtilsMap } from '@tldraw/core'
import { observer } from 'mobx-react-lite'
import * as React from 'react'
import { RectUtil, Shape } from './shapes'
import { Page, PageState } from './stores'

const page = new Page({
  id: 'page1',
  shapes: {
    rect1: {
      id: 'rect1',
      type: 'rect',
      parentId: 'page1',
      name: 'Rect',
      childIndex: 1,
      rotation: 0,
      point: [0, 0],
      size: [100, 100],
    },
  },
  bindings: {},
})

const pageState = new PageState()

const shapeUtils: TLShapeUtilsMap<Shape> = {
  rect: new RectUtil(),
}

export default observer(function App() {
  const onHoverShape: TLPointerEventHandler = (e) => {
    pageState.setHoveredId(e.target)
  }

  const onUnhoverShape: TLPointerEventHandler = () => {
    pageState.setHoveredId(undefined)
  }

  const onPointShape: TLPointerEventHandler = (info) => {
    pageState.setSelectedIds(info.target)
  }

  const onPointCanvas: TLPointerEventHandler = () => {
    pageState.clearSelectedIds()
  }

  const onDragShape: TLPointerEventHandler = (e) => {
    page.dragShape(e.target, e.point)
  }

  const onPointerMove: TLPointerEventHandler = (info) => {
    if (info.shiftKey) {
      pageState.pan(info.delta)
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
})
