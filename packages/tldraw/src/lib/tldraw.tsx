import {
  TLDocument,
  Renderer,
  RendererProps,
  TLShape,
  TLState,
} from '@tldraw/core'
import * as React from 'react'
import { rectangle, ellipse, RectangleShape, EllipseShape } from './shapes'
import state, { useSelector } from './state'

export type BaseShapes = RectangleShape | EllipseShape

export const baseShapes: RendererProps<BaseShapes>['shapes'] = {
  rectangle,
  ellipse,
}

/* eslint-disable-next-line */
export interface TldrawProps<T extends TLShape> {
  document?: TLDocument<T>
  onMount?: (tldraw: TLState<T>) => void
  onShapeSelect?: (shape: T) => void
  onShapeDelete?: (shape: T) => void
  onSelectAll?: (shape: T) => void
  onDeselectAll?: (shape: T) => void
  onCameraChange?: (shape: T) => void
}

export function Tldraw({ document, onMount }: TldrawProps<BaseShapes>) {
  React.useEffect(() => {
    if (document !== undefined) {
      state.updateFromDocument(document)
    }
  }, [document])

  const page = useSelector((s) => s.data.page)
  const pageState = useSelector((s) => s.data.pageState)

  return (
    <Renderer
      shapes={baseShapes}
      page={page}
      pageState={pageState}
      onMount={onMount}
    />
  )
}

export default Tldraw
