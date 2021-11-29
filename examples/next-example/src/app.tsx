/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { Renderer } from '@tldraw/next'
import { observer } from 'mobx-react-lite'
import { NuBoxShape } from 'stores/NuBoxShape'
import { NuExampleApp } from 'stores/NuExampleApp'

const app = new NuExampleApp()

app.currentPage.shapes = [
  new NuBoxShape({ id: 'box1' }),
  new NuBoxShape({ id: 'box2', point: [100, 100], size: [100, 100] }),
]

export default observer(function App(): JSX.Element {
  const {
    currentPage: { bindings },
    viewport,
    inputs,
    hoveredShape,
    selectedShapes,
    shapesInViewport,
    onPan,
    onPointerDown,
    onPointerUp,
    onPointerMove,
    onPointerEnter,
    onPointerLeave,
    onKeyDown,
    onKeyUp,
  } = app

  return (
    <div className="tldraw">
      <Renderer
        shapes={shapesInViewport}
        bindings={bindings}
        viewport={viewport}
        inputs={inputs}
        hoveredShape={hoveredShape}
        selectedShapes={selectedShapes}
        onPan={onPan}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      />
    </div>
  )
})
