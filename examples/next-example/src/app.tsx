/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { Renderer } from '@tldraw/next'
import { observer } from 'mobx-react-lite'
import { NuBoxShape } from 'stores/NuBoxShape'
import { TLNuApp } from '@tldraw/next/src/lib'

const app = new TLNuApp()

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
      />
    </div>
  )
})
