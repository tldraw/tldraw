import * as React from 'react'
import { Renderer } from '@tldraw/core'
import { Rectangle } from './rectangle'
import { Label } from './label'
import { appState } from './state'

const shapeUtils: any = {
  rectangle: Rectangle,
  label: Label,
}

export default function Core() {
  const page = appState.useStore((s) => s.page)
  const pageState = appState.useStore((s) => s.pageState)
  const meta = appState.useStore((s) => s.meta)

  return (
    <div className="tldraw">
      <Renderer
        shapeUtils={shapeUtils}
        page={page}
        pageState={pageState}
        meta={meta}
        onDoubleClickBounds={appState.onDoubleClickBounds}
        onDoubleClickShape={appState.onDoubleClickShape}
        onPointShape={appState.onPointShape}
        onPointCanvas={appState.onPointCanvas}
        onPointerDown={appState.onPointerDown}
        onPointerMove={appState.onPointerMove}
        onPointerUp={appState.onPointerUp}
        onShapeChange={appState.onShapeChange}
      />
    </div>
  )
}
