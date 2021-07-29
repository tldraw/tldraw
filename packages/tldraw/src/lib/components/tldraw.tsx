import * as React from 'react'
import { IdProvider } from '@radix-ui/react-id'
import { Renderer, TLCallbacks, Utils } from '@tldraw/core'
import { tldrawShapeUtils } from '../shape'
import { OnChangeCallback, state, TLDrawState, useSelector } from '../state'
import { TLDrawDocument } from '../types'
import { useKeyboardShortcuts } from '../hooks'
import styled from '../styles'
import { StylePanel } from './style-panel'
import { ToolsPanel } from './/tools-panel'

const callbacks: TLCallbacks = {
  // Camera events
  onPinchStart() {
    state.send('STARTED_PINCHING')
  },
  onPinchEnd() {
    state.send('STOPPED_PINCHING')
  },
  onPinch: state.fastPinch,
  onPan: state.fastPan,
  onZoom(info) {
    state.send('ZOOMED', info)
  },

  // Pointer Events
  onPointerMove: state.fastPointerMove,
  onStopPointing(info) {
    state.send('STOPPED_POINTING', info)
  },

  // Canvas (background)
  onPointCanvas(info) {
    state.send('POINTED_CANVAS', info)
  },
  onDoublePointCanvas(info) {
    state.send('DOUBLE_POINTED_CANVAS', info)
  },
  onRightPointCanvas(info) {
    state.send('RIGHT_POINTED_CANVAS', info)
  },
  onDragCanvas: state.fastBrush,
  onReleaseCanvas: (info) => {
    state.send('RELEASED_CANVAS', info)
  },

  // Shape
  onPointShape(info) {
    state.send('POINTED_SHAPE', info)
  },
  onDoublePointShape(info) {
    state.send('DOUBLE_POINTED_SHAPE', info)
  },
  onRightPointShape(info) {
    state.send('RIGHT_POINTED_SHAPE', info)
  },
  onDragShape: state.fastTranslate,
  onHoverShape(info) {
    state.send('HOVERED_SHAPE', info)
  },
  onUnhoverShape(info) {
    state.send('UNHOVERED_SHAPE', info)
  },
  onReleaseShape: (info) => {
    state.send('RELEASED_SHAPE', info)
  },

  // Bounds (bounding box background)
  onPointBounds(info) {
    state.send('POINTED_BOUNDS', info)
  },
  onDoublePointBounds(info) {
    state.send('DOUBLE_POINTED_BOUNDS', info)
  },
  onRightPointBounds(info) {
    state.send('RIGHT_POINTED_BOUNDS', info)
  },
  onDragBounds: state.fastTranslate,
  onHoverBounds: (info) => {
    state.send('HOVERED_BOUNDS', info)
  },
  onUnhoverBounds: (info) => {
    state.send('UNHOVERED_BOUNDS', info)
  },
  onReleaseBounds: (info) => {
    state.send('RELEASED_BOUNDS', info)
  },

  // Bounds handles (corners, edges)
  onPointBoundsHandle(info) {
    state.send('POINTED_BOUNDS_HANDLE', info)
  },
  onDoublePointBoundsHandle(info) {
    state.send('DOUBLE_POINTED_BOUNDS_HANDLE', info)
  },
  onRightPointBoundsHandle: (info) => {
    state.send('RIGHT_POINTED_BOUNDS_HANDLE', info)
  },
  onDragBoundsHandle: state.fastTransform,
  onHoverBoundsHandle: (info) => {
    state.send('HOVERED_BOUNDS_HANDLE', info)
  },
  onUnhoverBoundsHandle: (info) => {
    state.send('UNHOVERED_BOUNDS_HANDLE', info)
  },
  onReleaseBoundsHandle: (info) => {
    state.send('RELEASED_BOUNDS_HANDLE', info)
  },

  // Handles (ie the handles of a selected arrow)
  onPointHandle(info) {
    state.send('POINTED_HANDLE', info)
  },
  onRightPointHandle(info) {
    state.send('RIGHT_POINTED_HANDLE', info)
  },
  onDoublePointHandle(info) {
    state.send('DOUBLE_POINTED_HANDLE', info)
  },
  onDragHandle: (info) => {
    state.send('DRAGGED_HANDLE', info)
  },
  onHoverHandle: (info) => {
    state.send('HOVERED_HANDLE', info)
  },
  onUnhoverHandle: (info) => {
    state.send('UNHOVERED_HANDLE', info)
  },
  onReleaseHandle: (info) => {
    state.send('RELEASED_HANDLE', info)
  },

  // keys
  onError: (error: Error) => {
    // TODO
  },
  onBlurEditingShape() {
    /*TODO*/
  },
  onChange(ids) {
    state.send('CHANGED_RENDERING_COUNT', { count: ids.length })
  },
}

export interface TLDrawProps {
  document?: TLDrawDocument
  currentPageId?: string
  onMount?: (state: TLDrawState) => void
  onChange?: OnChangeCallback
}

export function TLDraw({ document, currentPageId, onMount, onChange }: TLDrawProps) {
  const hideBounds = useSelector((s) => !s.isIn('select'))

  const { page, pageState } = useSelector(
    (s) => ({
      page: s.data.page,
      pageState: s.data.pageState,
    }),
    Utils.shallowEqual,
  )

  React.useEffect(() => {
    if (!callbacks) return
    state.loadOnChange(onChange)
  }, [onChange])

  React.useEffect(() => {
    if (!document) return
    state.loadDocument(document)
  }, [document])

  React.useEffect(() => {
    if (!currentPageId) return
    state.loadCurrentPageId(currentPageId)
  }, [currentPageId])

  React.useEffect(() => {
    onMount?.(state)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useKeyboardShortcuts()

  return (
    <IdProvider>
      <Layout>
        <Renderer
          page={page}
          pageState={pageState}
          shapeUtils={tldrawShapeUtils}
          hideBounds={hideBounds}
          {...callbacks}
        />
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
    </IdProvider>
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
