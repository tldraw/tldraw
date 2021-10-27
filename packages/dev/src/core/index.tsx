import * as React from 'react'
import { Renderer, TLShapeUtilsMap } from '@tldraw/core'
import { BoxShape, BoxUtil } from './box'
import { LabelUtil, LabelShape } from './label'
import { appState } from './state'

const shapeUtils: TLShapeUtilsMap<BoxShape | LabelShape> = {
  box: new BoxUtil(),
  label: new LabelUtil(),
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
