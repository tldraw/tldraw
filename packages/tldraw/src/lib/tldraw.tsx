import * as React from 'react'
import { Renderer, RendererProps, Utils } from '@tldraw/core'
import { StatusBar } from './components/status-bar'
import { TLDrawShape, tldrawShapeUtils } from './shape'
import { state, TLDrawCallbacks, TLDrawState, useSelector } from './state'
import { TLDrawDocument } from './types'
import { useKeyboardShortcuts } from './hooks'
import styled from './styles'
import { StylePanel } from './components/style-panel'
import { ToolsPanel } from './components/tools-panel'

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
  onChange(ids) {
    state.send('CHANGED_RENDERING_COUNT', { count: ids.length })
  },
}

export interface TLDrawProps extends Partial<TLDrawCallbacks> {
  document?: TLDrawDocument
  currentPageId?: string
}

export function TLDraw({ document, currentPageId, ...callbacks }: TLDrawProps) {
  const { page, pageState } = useSelector(
    (s) => ({
      page: s.data.page,
      pageState: s.data.pageState,
    }),
    Utils.shallowEqual,
  )

  React.useEffect(() => {
    if (!callbacks) return
    state.loadCallbacks(callbacks)
  }, [callbacks])

  React.useEffect(() => {
    if (!document) return
    state.loadDocument(document)
  }, [document])

  React.useEffect(() => {
    if (!currentPageId) return
    state.loadCurrentPageId(currentPageId)
  }, [currentPageId])

  React.useEffect(() => {
    callbacks.onMount?.(state)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useKeyboardShortcuts()

  return (
    <Layout>
      <Renderer page={page} pageState={pageState} shapeUtils={tldrawShapeUtils} {...events} />
      <MenuButtons>
        {/* <Menu />
        <DebugPanel />
        <CodePanel />
        <PagePanel /> */}
      </MenuButtons>
      <Spacer />
      <StylePanel />
      <ToolsPanel />
    </Layout>
  )
}

const Spacer = styled('div', {
  flexGrow: 2,
})

const MenuButtons = styled('div', {
  display: 'flex',
  gap: 8,
})

const Layout = styled('main', {
  position: 'fixed',
  overflow: 'hidden',
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  height: '100%',
  width: '100%',
  padding: '8px 8px 0 8px',
  zIndex: 200,
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
  boxSizing: 'border-box',
  outline: 'none',

  '& .tl-container': {
    position: 'absolute',
  },

  pointerEvents: 'none',
  '& > *': {
    PointerEvent: 'all',
  },
})
