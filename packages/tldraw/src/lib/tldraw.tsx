import * as React from 'react'
import { Renderer, TLCallbacks, TLPage, TLPageState, TLPointerInfo, RendererProps } from '@tldraw/core'
import { StatusBar } from './components/status-bar'
import { TLDrawShape, tldrawShapeUtils } from './shapes'
import { state, TLDrawState, useSelector } from './state'
import { TLDrawDocument } from './types'
import { useKeyboardShortcuts } from './hooks'

const events: Partial<RendererProps<TLDrawShape>> = {
  onPointerMove: state.fastPointerMove,
  onPan: state.fastPan,
  onPinch: state.fastPinch,
  onPinchStart() {
    state.send('STARTED_PINCHING')
  },
  onPinchEnd() {
    state.send('STOPPED_PINCHING')
  },
  onStopPointing(info) {
    state.send('STOPPED_POINTING', info)
  },
  onPointCanvas(info) {
    state.send('POINTED_CANVAS', info)
  },
  onDoublePointCanvas(info) {
    state.send('DOUBLE_POINTED_CANVAS', info)
  },
  onRightPointCanvas(info) {
    state.send('RIGHT_POINTED_CANVAS', info)
  },
  onPointShape(info) {
    state.send('POINTED_SHAPE', info)
  },
  onRightPointShape(info) {
    state.send('RIGHT_POINTED_SHAPE', info)
  },
  onDoublePointShape(info) {
    state.send('DOUBLE_POINTED_SHAPE', info)
  },
  onPointBounds(info) {
    state.send('POINTED_BOUNDS', info)
  },
  onDoublePointBounds(info) {
    state.send('DOUBLE_POINTED_BOUNDS', info)
  },
  onRightPointBounds(info) {
    state.send('RIGHT_POINTED_BOUNDS', info)
  },
  onPointBoundsHandle(info) {
    state.send('POINTED_BOUNDS_HANDLE', info)
  },
  onDoublePointBoundsHandle(info) {
    state.send('DOUBLE_POINTED_BOUNDS_HANDLE', info)
  },
  onPointHandle(info) {
    state.send('POINTED_HANDLE', info)
  },
  onRightPointHandle(info) {
    state.send('RIGHT_POINTED_HANDLE', info)
  },
  onDoublePointHandle(info) {
    state.send('DOUBLE_POINTED_HANDLE', info)
  },
  onBlurEditingShape() {
    /*TODO*/
  },
}

export interface TLDrawProps extends Partial<TLCallbacks> {
  document?: TLDrawDocument
  onMount?: (tldraw: TLDrawState) => void
}

export function TLDraw({ document, onMount }: TLDrawProps) {
  const page = useSelector((s) => s.data.page)

  const pageState = useSelector((s) => s.data.pageState)

  React.useEffect(() => {
    if (document !== undefined) {
      state.updateFromDocument(document)
      onMount?.(state)
    }
  }, [onMount, document])

  useKeyboardShortcuts()

  return (
    <>
      <Renderer page={page} pageState={pageState} shapeUtils={tldrawShapeUtils} {...events} />
      <StatusBar />
    </>
  )
}
