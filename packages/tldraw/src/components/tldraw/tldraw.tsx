import * as React from 'react'
import { IdProvider } from '@radix-ui/react-id'
import { Renderer } from '@tldraw/core'
import styled from '~styles'
import type { Data, TLDrawDocument } from '~types'
import { TLDrawState } from '~state'
import { TLDrawContext, useCustomFonts, useKeyboardShortcuts, useTLDrawContext } from '~hooks'
import { tldrawShapeUtils } from '~shape'
import { ContextMenu } from '~components/context-menu'
import { StylePanel } from '~components/style-panel'
import { ToolsPanel } from '~components/tools-panel'
import { PagePanel } from '~components/page-panel'
import { Menu } from '~components/menu'

// Selectors
const isInSelectSelector = (s: Data) => s.appState.activeTool === 'select'

const isSelectedShapeWithHandlesSelector = (s: Data) => {
  const { shapes } = s.document.pages[s.appState.currentPageId]
  const { selectedIds } = s.document.pageStates[s.appState.currentPageId]
  return selectedIds.length === 1 && selectedIds.every((id) => shapes[id].handles !== undefined)
}

const pageSelector = (s: Data) => s.document.pages[s.appState.currentPageId]

const pageStateSelector = (s: Data) => s.document.pageStates[s.appState.currentPageId]

const isDarkModeSelector = (s: Data) => s.settings.isDarkMode

export interface TLDrawProps {
  /**
   * (optional) If provided, the component will load / persist state under this key.
   */
  id?: string
  /**
   * (optional) The document to load or update from.
   */
  document?: TLDrawDocument
  /**
   * (optional) The current page id.
   */
  currentPageId?: string
  /**
   * (optional) A callback to run when the component mounts.
   */
  onMount?: (state: TLDrawState) => void
  /**
   * (optional) A callback to run when the component's state changes.
   */
  onChange?: TLDrawState['_onChange']
}

export function TLDraw({ id, document, currentPageId, onMount, onChange }: TLDrawProps) {
  const [sId, setSId] = React.useState(id)

  const [tlstate, setTlstate] = React.useState(() => new TLDrawState(id, onChange, onMount))
  const [context, setContext] = React.useState(() => ({ tlstate, useSelector: tlstate.useStore }))

  React.useEffect(() => {
    if (id === sId) return
    // If a new id is loaded, replace the entire state
    const newState = new TLDrawState(id, onChange, onMount)
    setTlstate(newState)
    setContext({ tlstate: newState, useSelector: newState.useStore })
    setSId(id)
  }, [sId, id])

  // Use the `key` to ensure that new selector hooks are made when the id changes

  return (
    <TLDrawContext.Provider value={context}>
      <IdProvider>
        <InnerTldraw key={sId || 'tldraw'} currentPageId={currentPageId} document={document} />
      </IdProvider>
    </TLDrawContext.Provider>
  )
}

function InnerTldraw({
  currentPageId,
  document,
}: {
  currentPageId?: string
  document?: TLDrawDocument
}) {
  const { tlstate, useSelector } = useTLDrawContext()

  useCustomFonts()

  useKeyboardShortcuts()

  const page = useSelector(pageSelector)

  const pageState = useSelector(pageStateSelector)

  const isDarkMode = useSelector(isDarkModeSelector)

  const isSelecting = useSelector(isInSelectSelector)

  const isSelectedHandlesShape = useSelector(isSelectedShapeWithHandlesSelector)

  const isInSession = tlstate.session !== undefined

  // Hide bounds when not using the select tool, or when the only selected shape has handles
  const hideBounds =
    (tlstate.session && tlstate.session.id !== 'brush') || !isSelecting || isSelectedHandlesShape

  // Hide bounds when not using the select tool, or when in session
  const hideHandles = isInSession || !isSelecting

  // Hide indicators when not using the select tool, or when in session
  const hideIndicators = isInSession || !isSelecting

  // Custom rendering meta, with dark mode for shapes
  const meta = React.useMemo(() => ({ isDarkMode }), [isDarkMode])

  // Custom theme, based on darkmode
  const theme = React.useMemo(() => {
    if (isDarkMode) {
      return {
        brushFill: 'rgba(180, 180, 180, .05)',
        brushStroke: 'rgba(180, 180, 180, .25)',
        selected: 'rgba(38, 150, 255, 1.000)',
        selectFill: 'rgba(38, 150, 255, 0.05)',
        background: '#343d45',
        foreground: '#49555f',
      }
    }

    return {}
  }, [isDarkMode])

  React.useEffect(() => {
    if (!document) return
    if (document.id === tlstate.document.id) {
      tlstate.updateDocument(document)
    } else {
      tlstate.loadDocument(document)
    }
  }, [document, tlstate])

  React.useEffect(() => {
    if (!currentPageId) return
    tlstate.changePage(currentPageId)
  }, [currentPageId, tlstate])

  return (
    <Layout>
      <ContextMenu>
        <Renderer
          page={page}
          pageState={pageState}
          shapeUtils={tldrawShapeUtils}
          theme={theme}
          meta={meta}
          hideBounds={hideBounds}
          hideHandles={hideHandles}
          hideIndicators={hideIndicators}
          onPinchStart={tlstate.onPinchStart}
          onPinchEnd={tlstate.onPinchEnd}
          onPinch={tlstate.onPinch}
          onPan={tlstate.onPan}
          onZoom={tlstate.onZoom}
          onPointerDown={tlstate.onPointerDown}
          onPointerMove={tlstate.onPointerMove}
          onPointerUp={tlstate.onPointerUp}
          onPointCanvas={tlstate.onPointCanvas}
          onDoubleClickCanvas={tlstate.onDoubleClickCanvas}
          onRightPointCanvas={tlstate.onRightPointCanvas}
          onDragCanvas={tlstate.onDragCanvas}
          onReleaseCanvas={tlstate.onReleaseCanvas}
          onPointShape={tlstate.onPointShape}
          onDoubleClickShape={tlstate.onDoubleClickShape}
          onRightPointShape={tlstate.onRightPointShape}
          onDragShape={tlstate.onDragShape}
          onHoverShape={tlstate.onHoverShape}
          onUnhoverShape={tlstate.onUnhoverShape}
          onReleaseShape={tlstate.onReleaseShape}
          onPointBounds={tlstate.onPointBounds}
          onDoubleClickBounds={tlstate.onDoubleClickBounds}
          onRightPointBounds={tlstate.onRightPointBounds}
          onDragBounds={tlstate.onDragBounds}
          onHoverBounds={tlstate.onHoverBounds}
          onUnhoverBounds={tlstate.onUnhoverBounds}
          onReleaseBounds={tlstate.onReleaseBounds}
          onPointBoundsHandle={tlstate.onPointBoundsHandle}
          onDoubleClickBoundsHandle={tlstate.onDoubleClickBoundsHandle}
          onRightPointBoundsHandle={tlstate.onRightPointBoundsHandle}
          onDragBoundsHandle={tlstate.onDragBoundsHandle}
          onHoverBoundsHandle={tlstate.onHoverBoundsHandle}
          onUnhoverBoundsHandle={tlstate.onUnhoverBoundsHandle}
          onReleaseBoundsHandle={tlstate.onReleaseBoundsHandle}
          onPointHandle={tlstate.onPointHandle}
          onDoubleClickHandle={tlstate.onDoubleClickHandle}
          onRightPointHandle={tlstate.onRightPointHandle}
          onDragHandle={tlstate.onDragHandle}
          onHoverHandle={tlstate.onHoverHandle}
          onUnhoverHandle={tlstate.onUnhoverHandle}
          onReleaseHandle={tlstate.onReleaseHandle}
          onChange={tlstate.onChange}
          onError={tlstate.onError}
          onBlurEditingShape={tlstate.onBlurEditingShape}
          onTextBlur={tlstate.onTextBlur}
          onTextChange={tlstate.onTextChange}
          onTextKeyDown={tlstate.onTextKeyDown}
          onTextFocus={tlstate.onTextFocus}
          onTextKeyUp={tlstate.onTextKeyUp}
        />
      </ContextMenu>
      <MenuButtons>
        <Menu />
        <PagePanel />
      </MenuButtons>
      <Spacer />
      <StylePanel />
      <ToolsPanel />
    </Layout>
  )
}

const Layout = styled('div', {
  overflow: 'hidden',
  position: 'absolute',
  height: '100%',
  width: '100%',
  padding: '8px 8px 0 8px',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
  boxSizing: 'border-box',
  outline: 'none',
  pointerEvents: 'none',
  zIndex: 100,

  '& > *': {
    pointerEvents: 'all',
  },

  '& .tl-container': {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 100,
  },
})

const Spacer = styled('div', {
  flexGrow: 2,
})

const MenuButtons = styled('div', {
  display: 'flex',
  gap: 8,
})
