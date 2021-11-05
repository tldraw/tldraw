import * as React from 'react'
import { IdProvider } from '@radix-ui/react-id'
import { Renderer } from '@tldraw/core'
import styled, { dark } from '~styles'
import { Data, TLDrawDocument, TLDrawStatus, TLDrawUser } from '~types'
import { TLDrawState } from '~state'
import { TLDrawContext, useCustomFonts, useKeyboardShortcuts, useTLDrawContext } from '~hooks'
import { shapeUtils } from '~shape-utils'
import { ToolsPanel } from '~components/ToolsPanel'
import { TopPanel } from '~components/TopPanel'
import { TLDR } from '~state/tldr'
import { ContextMenu } from '~components/ContextMenu'
import { FocusButton } from '~components/FocusButton/FocusButton'

// Selectors
const isInSelectSelector = (s: Data) => s.appState.activeTool === 'select'

const isHideBoundsShapeSelector = (s: Data) => {
  const { shapes } = s.document.pages[s.appState.currentPageId]
  const { selectedIds } = s.document.pageStates[s.appState.currentPageId]
  return (
    selectedIds.length === 1 &&
    selectedIds.every((id) => TLDR.getShapeUtils(shapes[id].type).hideBounds)
  )
}

const pageSelector = (s: Data) => s.document.pages[s.appState.currentPageId]

const snapLinesSelector = (s: Data) => s.appState.snapLines

const usersSelector = (s: Data) => s.room?.users

const pageStateSelector = (s: Data) => s.document.pageStates[s.appState.currentPageId]

const settingsSelector = (s: Data) => s.settings

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
   * (optional) Whether the editor should immediately receive focus. Defaults to true.
   */
  autofocus?: boolean

  /**
   * (optional) Whether to show the menu UI.
   */
  showMenu?: boolean

  /**
   * (optional) Whether to show the pages UI.
   */
  showPages?: boolean

  /**
   * (optional) Whether to show the styles UI.
   */
  showStyles?: boolean

  /**
   * (optional) Whether to show the zoom UI.
   */
  showZoom?: boolean

  /**
   * (optional) Whether to show the tools UI.
   */
  showTools?: boolean

  /**
   * (optional) Whether to show the UI.
   */
  showUI?: boolean

  /**
   * (optional) Whether to the document should be read only.
   */
  readOnly?: boolean

  /**
   * (optional) A callback to run when the component mounts.
   */
  onMount?: (state: TLDrawState) => void

  /**
   * (optional) A callback to run when the component's state changes.
   */
  onChange?: TLDrawState['_onChange']

  onUserChange?: (state: TLDrawState, user: TLDrawUser) => void
}

export function TLDraw({
  id,
  document,
  currentPageId,
  autofocus = true,
  showMenu = true,
  showPages = true,
  showTools = true,
  showZoom = true,
  showStyles = true,
  showUI = true,
  readOnly = false,
  onMount,
  onChange,
  onUserChange,
}: TLDrawProps) {
  const [sId, setSId] = React.useState(id)

  const [tlstate, setTlstate] = React.useState(
    () => new TLDrawState(id, onMount, onChange, onUserChange)
  )
  const [context, setContext] = React.useState(() => ({ tlstate, useSelector: tlstate.useStore }))

  React.useEffect(() => {
    if (id === sId) return
    // If a new id is loaded, replace the entire state
    const newState = new TLDrawState(id, onMount, onChange, onUserChange)
    setTlstate(newState)
    setContext({ tlstate: newState, useSelector: newState.useStore })
    setSId(id)
  }, [sId, id])

  React.useEffect(() => {
    tlstate.readOnly = readOnly
  }, [tlstate, readOnly])

  // Use the `key` to ensure that new selector hooks are made when the id changes
  return (
    <TLDrawContext.Provider value={context}>
      <IdProvider>
        <InnerTldraw
          key={sId || 'tldraw'}
          id={sId}
          currentPageId={currentPageId}
          document={document}
          autofocus={autofocus}
          showPages={showPages}
          showMenu={showMenu}
          showStyles={showStyles}
          showZoom={showZoom}
          showTools={showTools}
          showUI={showUI}
          readOnly={readOnly}
        />
      </IdProvider>
    </TLDrawContext.Provider>
  )
}

interface InnerTLDrawProps {
  id?: string
  currentPageId?: string
  autofocus: boolean
  showPages: boolean
  showMenu: boolean
  showZoom: boolean
  showStyles: boolean
  showUI: boolean
  showTools: boolean
  readOnly: boolean
  document?: TLDrawDocument
}

function InnerTldraw({
  id,
  currentPageId,
  autofocus,
  showPages,
  showMenu,
  showZoom,
  showStyles,
  showTools,
  readOnly,
  showUI,
  document,
}: InnerTLDrawProps) {
  const { tlstate, useSelector } = useTLDrawContext()

  const rWrapper = React.useRef<HTMLDivElement>(null)

  const page = useSelector(pageSelector)

  const pageState = useSelector(pageStateSelector)

  const snapLines = useSelector(snapLinesSelector)

  const users = useSelector(usersSelector)

  const settings = useSelector(settingsSelector)

  const isSelecting = useSelector(isInSelectSelector)

  const isHideBoundsShape = useSelector(isHideBoundsShapeSelector)

  const isInSession = tlstate.session !== undefined

  // Hide bounds when not using the select tool, or when the only selected shape has handles
  const hideBounds =
    (isInSession && tlstate.session?.constructor.name !== 'BrushSession') ||
    !isSelecting ||
    isHideBoundsShape ||
    !!pageState.editingId

  // Hide bounds when not using the select tool, or when in session
  const hideHandles = isInSession || !isSelecting

  // Hide indicators when not using the select tool, or when in session
  const hideIndicators =
    (isInSession && tlstate.appState.status !== TLDrawStatus.Brushing) || !isSelecting

  // Custom rendering meta, with dark mode for shapes
  const meta = React.useMemo(() => ({ isDarkMode: settings.isDarkMode }), [settings.isDarkMode])

  // Custom theme, based on darkmode
  const theme = React.useMemo(() => {
    if (settings.isDarkMode) {
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
  }, [settings.isDarkMode])

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
    <StyledLayout ref={rWrapper} tabIndex={0} className={settings.isDarkMode ? dark : ''}>
      <OneOff focusableRef={rWrapper} autofocus={autofocus} />
      <ContextMenu>
        <Renderer
          id={id}
          containerRef={rWrapper}
          shapeUtils={shapeUtils}
          page={page}
          pageState={pageState}
          snapLines={snapLines}
          users={users}
          userId={tlstate.state.room?.userId}
          theme={theme}
          meta={meta}
          hideBounds={hideBounds}
          hideHandles={hideHandles}
          hideIndicators={hideIndicators}
          hideBindingHandles={!settings.showBindingHandles}
          hideCloneHandles={!settings.showCloneHandles}
          hideRotateHandles={!settings.showRotateHandles}
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
          onError={tlstate.onError}
          onRenderCountChange={tlstate.onRenderCountChange}
          onShapeChange={tlstate.onShapeChange}
          onShapeBlur={tlstate.onShapeBlur}
          onShapeClone={tlstate.onShapeClone}
          onBoundsChange={tlstate.updateBounds}
          onKeyDown={tlstate.onKeyDown}
          onKeyUp={tlstate.onKeyUp}
        />
      </ContextMenu>
      {showUI && (
        <StyledUI>
          {settings.isFocusMode ? (
            <FocusButton onSelect={tlstate.toggleFocusMode} />
          ) : (
            <>
              <TopPanel
                readOnly={readOnly}
                showPages={showPages}
                showMenu={showMenu}
                showStyles={showStyles}
                showZoom={showZoom}
              />
              <StyledSpacer />
              {showTools && !readOnly && <ToolsPanel />}
            </>
          )}
        </StyledUI>
      )}
    </StyledLayout>
  )
}

const OneOff = React.memo(
  ({
    focusableRef,
    autofocus,
  }: {
    autofocus?: boolean
    focusableRef: React.RefObject<HTMLDivElement>
  }) => {
    useKeyboardShortcuts(focusableRef)
    useCustomFonts()

    React.useEffect(() => {
      if (autofocus) {
        focusableRef.current?.focus()
      }
    }, [autofocus])

    return null
  }
)

const StyledLayout = styled('div', {
  position: 'absolute',
  height: '100%',
  width: '100%',
  minHeight: 0,
  minWidth: 0,
  maxHeight: '100%',
  maxWidth: '100%',
  overflow: 'hidden',
  boxSizing: 'border-box',
  outline: 'none',

  '& .tl-container': {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    width: '100%',
    zIndex: 1,
  },
})

const StyledUI = styled('div', {
  position: 'absolute',
  top: 0,
  left: 0,
  height: '100%',
  width: '100%',
  padding: '8px 8px 0 8px',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
  pointerEvents: 'none',
  zIndex: 2,
  '& > *': {
    pointerEvents: 'all',
  },
})

const StyledSpacer = styled('div', {
  flexGrow: 2,
})
