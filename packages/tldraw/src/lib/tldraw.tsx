import { TLDocument, Renderer, TLCallbacks, TLShapeUtils } from '@tldraw/core'
import * as React from 'react'
import { StatusBar } from './components/status-bar'
import { rectangle, ellipse, RectangleShape, EllipseShape } from './shapes'
import state, { TLDrawState, useSelector } from './state'

export type TLDrawShapeUtils = RectangleShape | EllipseShape

export const baseShapeUtils: TLShapeUtils<TLDrawShapeUtils> = {
  rectangle,
  ellipse,
}

export interface TldrawProps extends Partial<TLCallbacks> {
  document?: TLDocument<TLDrawShapeUtils>
  onMount?: (tldraw: TLDrawState<TLDrawShapeUtils>) => void
}

export function Tldraw({ document, onMount }: TldrawProps) {
  const page = useSelector((s) => s.data.page)

  const pageState = useSelector((s) => s.data.pageState)

  React.useEffect(() => {
    if (document !== undefined) {
      state.updateFromDocument(document)
      onMount?.(state)
    }
  }, [onMount, document])

  return (
    <>
      <Renderer
        shapeUtils={baseShapeUtils}
        page={page}
        pageState={pageState}
        onPan={state.fastPan}
        onPinch={state.fastPinch}
      />
      <StatusBar />
    </>
  )
}

export default Tldraw
