import * as React from 'react'
import {
  Renderer,
  TLCallbacks,
  TLPage,
  TLPageState,
  TLPointerInfo,
} from '@tldraw/core'
import { StatusBar } from './components/status-bar'
import { tldrawShapeUtils } from './state/shapes'
import { state, TLDrawState, useSelector } from './state'
import { TLDrawDocument } from './types'

const events = {
  onPan: state.fastPan,
  onPinch: state.fastPinch,
  onPointCanvas(info: TLPointerInfo) {
    state.send('POINTED_CANVAS', info)
  },
  onPointShape(info: TLPointerInfo) {
    state.send('POINTED_SHAPE', info)
  },
  onStopPointing(info: TLPointerInfo) {
    state.send('STOPPED_POINTING', info)
  },
  onPointerMove(info: TLPointerInfo) {
    if (state.isIn('brushSelecting')) {
      state.fastBrush(info)
      return
    }

    state.send('MOVED_POINTER', info)
  },
}

export interface TLDrawProps extends Partial<TLCallbacks> {
  document?: TLDrawDocument
  onMount?: (tldraw: TLDrawState) => void
}

export function Tldraw({ document, onMount }: TLDrawProps) {
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
        page={page}
        pageState={pageState}
        shapeUtils={tldrawShapeUtils}
        {...events}
      />
      <StatusBar />
    </>
  )
}

export default Tldraw
