import * as React from 'react'
import { IdProvider } from '@radix-ui/react-id'
import { Renderer } from '@tldraw/core'
import { styled, dark } from '~styles'
import { TLDrawSnapshot, TLDrawDocument, TLDrawStatus, TLDrawUser } from '~types'
import { TLDrawCallbacks, TLDrawState } from '~state'
import {
  TLDrawContext,
  TLDrawContextType,
  useStylesheet,
  useKeyboardShortcuts,
  useTLDrawContext,
} from '~hooks'
import { shapeUtils } from '~state/shapes'
import { ToolsPanel } from '~components/ToolsPanel'
import { TopPanel } from '~components/TopPanel'
import { TLDR } from '~state/TLDR'
import { ContextMenu } from '~components/ContextMenu'
import { FocusButton } from '~components/FocusButton/FocusButton'

// Selectors
const isInSelectSelector = (s: TLDrawSnapshot) => s.appState.activeTool === 'select'

const isHideBoundsShapeSelector = (s: TLDrawSnapshot) => {
  const { shapes } = s.document.pages[s.appState.currentPageId]
  const { selectedIds } = s.document.pageStates[s.appState.currentPageId]
  return (
    selectedIds.length === 1 &&
    selectedIds.every((id) => TLDR.getShapeUtils(shapes[id].type).hideBounds)
  )
}

const pageSelector = (s: TLDrawSnapshot) => s.document.pages[s.appState.currentPageId]

const snapLinesSelector = (s: TLDrawSnapshot) => s.appState.snapLines

const usersSelector = (s: TLDrawSnapshot) => s.room?.users

const pageStateSelector = (s: TLDrawSnapshot) => s.document.pageStates[s.appState.currentPageId]

const settingsSelector = (s: TLDrawSnapshot) => s.settings

export interface TLDrawProps extends TLDrawCallbacks {
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
   * (optional) A callback to run when the user creates a new project through the menu or through a keyboard shortcut.
   */
  onNewProject?: (state: TLDrawState, e?: KeyboardEvent) => void
  /**
   * (optional) A callback to run when the user saves a project through the menu or through a keyboard shortcut.
   */
  onSaveProject?: (state: TLDrawState, e?: KeyboardEvent) => void
  /**
   * (optional) A callback to run when the user saves a project as a new project through the menu or through a keyboard shortcut.
   */
  onSaveProjectAs?: (state: TLDrawState, e?: KeyboardEvent) => void
  /**
   * (optional) A callback to run when the user opens new project through the menu or through a keyboard shortcut.
   */
  onOpenProject?: (state: TLDrawState, e?: KeyboardEvent) => void
  /**
   * (optional) A callback to run when the user signs in via the menu.
   */
  onSignIn?: (state: TLDrawState) => void
  /**
   * (optional) A callback to run when the user signs out via the menu.
   */
  onSignOut?: (state: TLDrawState) => void

  /**
   * (optional) A callback to run when the user creates a new project.
   */
  onUserChange?: (state: TLDrawState, user: TLDrawUser) => void
  /**
   * (optional) A callback to run when the component's state changes.
   */
  onChange?: (state: TLDrawState, reason?: string) => void
  /**
   * (optional) A callback to run when the state is patched.
   */
  onPatch?: (state: TLDrawState, reason?: string) => void
  /**
   * (optional) A callback to run when the state is changed with a command.
   */
  onCommand?: (state: TLDrawState, reason?: string) => void
  /**
   * (optional) A callback to run when the state is persisted.
   */
  onPersist?: (state: TLDrawState) => void
  /**
   * (optional) A callback to run when the user undos.
   */
  onUndo?: (state: TLDrawState) => void
  /**
   * (optional) A callback to run when the user redos.
   */
  onRedo?: (state: TLDrawState) => void
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
  onNewProject,
  onSaveProject,
  onSaveProjectAs,
  onOpenProject,
  onSignOut,
  onSignIn,
  onUndo,
  onRedo,
  onPersist,
  onPatch,
  onCommand,
}: TLDrawProps) {
  const [sId, setSId] = React.useState(id)

  const [state, setState] = React.useState(
    () =>
      new TLDrawState(id, {
        onMount,
        onChange,
        onUserChange,
        onNewProject,
        onSaveProject,
        onSaveProjectAs,
        onOpenProject,
        onSignOut,
        onSignIn,
        onUndo,
        onRedo,
        onPatch,
        onCommand,
        onPersist,
      })
  )

  const [context, setContext] = React.useState<TLDrawContextType>(() => ({
    state,
    useSelector: state.useStore,
  }))

  React.useEffect(() => {
    if (id === sId) return

    const newState = new TLDrawState(id, {
      onMount,
      onChange,
      onUserChange,
      onNewProject,
      onSaveProject,
      onSaveProjectAs,
      onOpenProject,
      onSignOut,
      onSignIn,
      onUndo,
      onRedo,
      onPatch,
      onCommand,
      onPersist,
    })

    setSId(id)

    setContext((ctx) => ({
      ...ctx,
      state: newState,
      useSelector: newState.useStore,
    }))

    setState(newState)
  }, [sId, id])

  React.useEffect(() => {
    state.readOnly = readOnly
  }, [state, readOnly])

  React.useEffect(() => {
    if (!document) return

    if (document.id === state.document.id) {
      state.updateDocument(document)
    } else {
      state.loadDocument(document)
    }
  }, [document, state])

  React.useEffect(() => {
    state.callbacks = {
      onMount,
      onChange,
      onUserChange,
      onNewProject,
      onSaveProject,
      onSaveProjectAs,
      onOpenProject,
      onSignOut,
      onSignIn,
      onUndo,
      onRedo,
      onPatch,
      onCommand,
      onPersist,
    }
  }, [
    state,
    onMount,
    onChange,
    onUserChange,
    onNewProject,
    onSaveProject,
    onSaveProjectAs,
    onOpenProject,
    onSignOut,
    onSignIn,
    onUndo,
    onRedo,
    onPatch,
    onCommand,
    onPersist,
  ])

  // Use the `key` to ensure that new selector hooks are made when the id changes
  return (
    <TLDrawContext.Provider value={context}>
      <IdProvider>
        <InnerTLDraw
          key={sId || 'tldraw'}
          id={sId}
          currentPageId={currentPageId}
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
}

const InnerTLDraw = React.memo(function InnerTLDraw({
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
}: InnerTLDrawProps) {
  const { state, useSelector } = useTLDrawContext()

  const rWrapper = React.useRef<HTMLDivElement>(null)

  const page = useSelector(pageSelector)

  const pageState = useSelector(pageStateSelector)

  const snapLines = useSelector(snapLinesSelector)

  const users = useSelector(usersSelector)

  const settings = useSelector(settingsSelector)

  const isSelecting = useSelector(isInSelectSelector)

  const isHideBoundsShape = useSelector(isHideBoundsShapeSelector)

  const isInSession = state.session !== undefined

  // Hide bounds when not using the select tool, or when the only selected shape has handles
  const hideBounds =
    (isInSession && state.session?.constructor.name !== 'BrushSession') ||
    !isSelecting ||
    isHideBoundsShape ||
    !!pageState.editingId

  // Hide bounds when not using the select tool, or when in session
  const hideHandles = isInSession || !isSelecting

  // Hide indicators when not using the select tool, or when in session
  const hideIndicators =
    (isInSession && state.appState.status !== TLDrawStatus.Brushing) || !isSelecting

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
    if (!currentPageId) return
    state.changePage(currentPageId)
  }, [currentPageId, state])

  const handleBlur = React.useCallback<React.FocusEventHandler>((e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      const downEvent = new Event('pointerdown', { bubbles: true })
      const upEvent = new Event('pointerup', { bubbles: true })
      const node = rWrapper.current
      if (!node) return
      node.dispatchEvent(downEvent)
      node.dispatchEvent(upEvent)
    }
  }, [])

  return (
    <StyledLayout ref={rWrapper} tabIndex={0} className={settings.isDarkMode ? dark : ''}>
      <OneOff focusableRef={rWrapper} autofocus={autofocus} />
      <ContextMenu onBlur={handleBlur}>
        <Renderer
          id={id}
          containerRef={rWrapper}
          shapeUtils={shapeUtils}
          page={page}
          pageState={pageState}
          snapLines={snapLines}
          users={users}
          userId={state.state.room?.userId}
          theme={theme}
          meta={meta}
          hideBounds={hideBounds}
          hideHandles={hideHandles}
          hideIndicators={hideIndicators}
          hideBindingHandles={!settings.showBindingHandles}
          hideCloneHandles={!settings.showCloneHandles}
          hideRotateHandles={!settings.showRotateHandles}
          onPinchStart={state.onPinchStart}
          onPinchEnd={state.onPinchEnd}
          onPinch={state.onPinch}
          onPan={state.onPan}
          onZoom={state.onZoom}
          onPointerDown={state.onPointerDown}
          onPointerMove={state.onPointerMove}
          onPointerUp={state.onPointerUp}
          onPointCanvas={state.onPointCanvas}
          onDoubleClickCanvas={state.onDoubleClickCanvas}
          onRightPointCanvas={state.onRightPointCanvas}
          onDragCanvas={state.onDragCanvas}
          onReleaseCanvas={state.onReleaseCanvas}
          onPointShape={state.onPointShape}
          onDoubleClickShape={state.onDoubleClickShape}
          onRightPointShape={state.onRightPointShape}
          onDragShape={state.onDragShape}
          onHoverShape={state.onHoverShape}
          onUnhoverShape={state.onUnhoverShape}
          onReleaseShape={state.onReleaseShape}
          onPointBounds={state.onPointBounds}
          onDoubleClickBounds={state.onDoubleClickBounds}
          onRightPointBounds={state.onRightPointBounds}
          onDragBounds={state.onDragBounds}
          onHoverBounds={state.onHoverBounds}
          onUnhoverBounds={state.onUnhoverBounds}
          onReleaseBounds={state.onReleaseBounds}
          onPointBoundsHandle={state.onPointBoundsHandle}
          onDoubleClickBoundsHandle={state.onDoubleClickBoundsHandle}
          onRightPointBoundsHandle={state.onRightPointBoundsHandle}
          onDragBoundsHandle={state.onDragBoundsHandle}
          onHoverBoundsHandle={state.onHoverBoundsHandle}
          onUnhoverBoundsHandle={state.onUnhoverBoundsHandle}
          onReleaseBoundsHandle={state.onReleaseBoundsHandle}
          onPointHandle={state.onPointHandle}
          onDoubleClickHandle={state.onDoubleClickHandle}
          onRightPointHandle={state.onRightPointHandle}
          onDragHandle={state.onDragHandle}
          onHoverHandle={state.onHoverHandle}
          onUnhoverHandle={state.onUnhoverHandle}
          onReleaseHandle={state.onReleaseHandle}
          onError={state.onError}
          onRenderCountChange={state.onRenderCountChange}
          onShapeChange={state.onShapeChange}
          onShapeBlur={state.onShapeBlur}
          onShapeClone={state.onShapeClone}
          onBoundsChange={state.updateBounds}
          onKeyDown={state.onKeyDown}
          onKeyUp={state.onKeyUp}
        />
      </ContextMenu>
      {showUI && (
        <StyledUI>
          {settings.isFocusMode ? (
            <FocusButton onSelect={state.toggleFocusMode} />
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
})

const OneOff = React.memo(function OneOff({
  focusableRef,
  autofocus,
}: {
  autofocus?: boolean
  focusableRef: React.RefObject<HTMLDivElement>
}) {
  useKeyboardShortcuts(focusableRef)
  useStylesheet()

  React.useEffect(() => {
    if (autofocus) {
      focusableRef.current?.focus()
    }
  }, [autofocus])

  return null
})

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
