import * as React from 'react'
import { IdProvider } from '@radix-ui/react-id'
import { Renderer, TLCallbacks, TLTheme, Utils } from '@tldraw/core'
import { tldrawShapeUtils } from '../shape'
import { TLDrawDocument } from '../types'
import { useKeyboardShortcuts } from '../hooks'
import styled from '../styles'
import { StylePanel } from './style-panel'
import { ToolsPanel } from './tools-panel'
import { TLDrawState, useAppState, tlstate } from '../state/state2'

const callbacks: TLCallbacks = {
  onPinchStart: (...args) => tlstate.onPinchStart(...args),
  onPinchEnd: (...args) => tlstate.onPinchEnd(...args),
  onPinch: (...args) => tlstate.onPinch(...args),
  onPan: (...args) => tlstate.onPan(...args),
  onZoom: (...args) => tlstate.onZoom(...args),
  onPointerMove: (...args) => tlstate.onPointerMove(...args),
  onPointerUp: (...args) => tlstate.onPointerUp(...args),
  onPointCanvas: (...args) => tlstate.onPointCanvas(...args),
  onDoublePointCanvas: (...args) => tlstate.onDoublePointCanvas(...args),
  onRightPointCanvas: (...args) => tlstate.onRightPointCanvas(...args),
  onDragCanvas: (...args) => tlstate.onDragCanvas(...args),
  onReleaseCanvas: (...args) => tlstate.onReleaseCanvas(...args),
  onPointShape: (...args) => tlstate.onPointShape(...args),
  onDoublePointShape: (...args) => tlstate.onDoublePointShape(...args),
  onRightPointShape: (...args) => tlstate.onRightPointShape(...args),
  onDragShape: (...args) => tlstate.onDragShape(...args),
  onHoverShape: (...args) => tlstate.onHoverShape(...args),
  onUnhoverShape: (...args) => tlstate.onUnhoverShape(...args),
  onReleaseShape: (...args) => tlstate.onReleaseShape(...args),
  onPointBounds: (...args) => tlstate.onPointBounds(...args),
  onDoublePointBounds: (...args) => tlstate.onDoublePointBounds(...args),
  onRightPointBounds: (...args) => tlstate.onRightPointBounds(...args),
  onDragBounds: (...args) => tlstate.onDragBounds(...args),
  onHoverBounds: (...args) => tlstate.onHoverBounds(...args),
  onUnhoverBounds: (...args) => tlstate.onUnhoverBounds(...args),
  onReleaseBounds: (...args) => tlstate.onReleaseBounds(...args),
  onPointBoundsHandle: (...args) => tlstate.onPointBoundsHandle(...args),
  onDoublePointBoundsHandle: (...args) => tlstate.onDoublePointBoundsHandle(...args),
  onRightPointBoundsHandle: (...args) => tlstate.onRightPointBoundsHandle(...args),
  onDragBoundsHandle: (...args) => tlstate.onDragBoundsHandle(...args),
  onHoverBoundsHandle: (...args) => tlstate.onHoverBoundsHandle(...args),
  onUnhoverBoundsHandle: (...args) => tlstate.onUnhoverBoundsHandle(...args),
  onReleaseBoundsHandle: (...args) => tlstate.onReleaseBoundsHandle(...args),
  onPointHandle: (...args) => tlstate.onPointHandle(...args),
  onDoublePointHandle: (...args) => tlstate.onDoublePointHandle(...args),
  onRightPointHandle: (...args) => tlstate.onRightPointHandle(...args),
  onDragHandle: (...args) => tlstate.onDragHandle(...args),
  onHoverHandle: (...args) => tlstate.onHoverHandle(...args),
  onUnhoverHandle: (...args) => tlstate.onUnhoverHandle(...args),
  onReleaseHandle: (...args) => tlstate.onReleaseHandle(...args),
  onChange: (...args) => tlstate.onChange(...args),
  onError: (...args) => tlstate.onError(...args),
  onBlurEditingShape: (...args) => tlstate.onBlurEditingShape(...args),
}

export interface TLDrawProps {
  document?: TLDrawDocument
  currentPageId?: string
  onMount?: (state: TLDrawState) => void
  onChange?: (state: TLDrawState) => void
}

export function TLDraw({ document, currentPageId, onMount, onChange: _onChange }: TLDrawProps) {
  // const hideBounds = useSelector((s) => !s.isIn('select'))

  const hideBounds = useAppState((s) => s.appState.activeTool !== 'select')
  const page = useAppState((s) => s.page)
  const pageState = useAppState((s) => s.pageState)

  React.useEffect(() => {
    _onChange?.(tlstate)
  })

  React.useEffect(() => {
    if (!document) return
    tlstate.loadDocument(document)
  }, [document])

  React.useEffect(() => {
    if (!currentPageId) return
    tlstate.setCurrentPageId(currentPageId)
  }, [currentPageId])

  React.useEffect(() => {
    onMount?.(tlstate)
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
  pointerEvents: 'none',
  '& > *': {
    pointerEvents: 'all',
  },
  '& .tl-container': {
    position: 'absolute',
    top: 0,
    left: 0,
  },
})
