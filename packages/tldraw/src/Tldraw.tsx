import * as React from 'react'
import { IdProvider } from '@radix-ui/react-id'
import { Renderer } from '@tldraw/core'
import { styled, dark } from '~styles'
import { TDDocument, TDShape, TDStatus, TDUser } from '~types'
import { TldrawApp, TDCallbacks } from '~state'
import { TldrawContext, useStylesheet, useKeyboardShortcuts, useTldrawApp } from '~hooks'
import { shapeUtils } from '~state/shapes'
import { ToolsPanel } from '~components/ToolsPanel'
import { TopPanel } from '~components/TopPanel'
import { TLDR } from '~state/TLDR'
import { ContextMenu } from '~components/ContextMenu'
import { FocusButton } from '~components/FocusButton/FocusButton'

export interface TldrawProps extends TDCallbacks {
  /**
   * (optional) If provided, the component will load / persist state under this key.
   */
  id?: string

  /**
   * (optional) The document to load or update from.
   */
  document?: TDDocument

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
   * (optional) Whether to show a sponsor link for Tldraw.
   */
  showSponsorLink?: boolean

  /**
   * (optional) Whether to show the UI.
   */
  showUI?: boolean

  /**
   * (optional) Whether to the document should be read only.
   */
  readOnly?: boolean

  /**
   * (optional) Whether to to show the app's dark mode UI.
   */
  darkMode?: boolean

  /**
   * (optional) A callback to run when the component mounts.
   */
  onMount?: (state: TldrawApp) => void

  /**
   * (optional) A callback to run when the user creates a new project through the menu or through a keyboard shortcut.
   */
  onNewProject?: (state: TldrawApp, e?: KeyboardEvent) => void

  /**
   * (optional) A callback to run when the user saves a project through the menu or through a keyboard shortcut.
   */
  onSaveProject?: (state: TldrawApp, e?: KeyboardEvent) => void

  /**
   * (optional) A callback to run when the user saves a project as a new project through the menu or through a keyboard shortcut.
   */
  onSaveProjectAs?: (state: TldrawApp, e?: KeyboardEvent) => void

  /**
   * (optional) A callback to run when the user opens new project through the menu or through a keyboard shortcut.
   */
  onOpenProject?: (state: TldrawApp, e?: KeyboardEvent) => void

  /**
   * (optional) A callback to run when the user signs in via the menu.
   */
  onSignIn?: (state: TldrawApp) => void

  /**
   * (optional) A callback to run when the user signs out via the menu.
   */
  onSignOut?: (state: TldrawApp) => void

  /**
   * (optional) A callback to run when the user creates a new project.
   */
  onUserChange?: (state: TldrawApp, user: TDUser) => void
  /**
   * (optional) A callback to run when the component's state changes.
   */
  onChange?: (state: TldrawApp, reason?: string) => void
  /**
   * (optional) A callback to run when the state is patched.
   */
  onPatch?: (state: TldrawApp, reason?: string) => void
  /**
   * (optional) A callback to run when the state is changed with a command.
   */
  onCommand?: (state: TldrawApp, reason?: string) => void
  /**
   * (optional) A callback to run when the state is persisted.
   */
  onPersist?: (state: TldrawApp) => void
  /**
   * (optional) A callback to run when the user undos.
   */
  onUndo?: (state: TldrawApp) => void
  /**
   * (optional) A callback to run when the user redos.
   */
  onRedo?: (state: TldrawApp) => void

  onChangeShapes?: (app: TldrawApp, shapes: Record<string, TDShape | undefined>) => void
}

export function Tldraw({
  id,
  document,
  currentPageId,
  darkMode = false,
  autofocus = true,
  showMenu = true,
  showPages = true,
  showTools = true,
  showZoom = true,
  showStyles = true,
  showUI = true,
  readOnly = false,
  showSponsorLink = false,
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
  onChangeShapes,
}: TldrawProps) {
  const [sId, setSId] = React.useState(id)

  // Create a new app when the component mounts.
  const [app, setApp] = React.useState(
    () =>
      new TldrawApp(id, {
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
        onChangeShapes,
      })
  )

  // Create a new app if the `id` prop changes.
  React.useEffect(() => {
    if (id === sId) return

    const newApp = new TldrawApp(id, {
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
      onChangeShapes,
    })

    setSId(id)

    setApp(newApp)
  }, [sId, id])

  // Update the document if the `document` prop changes but the ids,
  // are the same, or else load a new document if the ids are different.
  React.useEffect(() => {
    if (!document) return

    if (document.id === app.document.id) {
      app.updateDocument(document)
    } else {
      app.loadDocument(document)
    }
  }, [document, app])

  // Change the page when the `currentPageId` prop changes
  React.useEffect(() => {
    if (!currentPageId) return
    app.changePage(currentPageId)
  }, [currentPageId, app])

  // Toggle the app's readOnly mode when the `readOnly` prop changes
  React.useEffect(() => {
    app.readOnly = readOnly
  }, [app, readOnly])

  // Toggle the app's readOnly mode when the `readOnly` prop changes
  React.useEffect(() => {
    if (darkMode && !app.settings.isDarkMode) {
      // app.toggleDarkMode()
    }
  }, [app, darkMode])

  // Update the app's callbacks when any callback changes.
  React.useEffect(() => {
    app.callbacks = {
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
      onChangeShapes,
    }
  }, [
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
    onChangeShapes,
  ])

  // Use the `key` to ensure that new selector hooks are made when the id changes
  return (
    <TldrawContext.Provider value={app}>
      <IdProvider>
        <InnerTldraw
          key={sId || 'Tldraw'}
          id={sId}
          autofocus={autofocus}
          showPages={showPages}
          showMenu={showMenu}
          showStyles={showStyles}
          showZoom={showZoom}
          showTools={showTools}
          showUI={showUI}
          showSponsorLink={showSponsorLink}
          readOnly={readOnly}
        />
      </IdProvider>
    </TldrawContext.Provider>
  )
}

interface InnerTldrawProps {
  id?: string
  autofocus: boolean
  showPages: boolean
  showMenu: boolean
  showZoom: boolean
  showStyles: boolean
  showUI: boolean
  showTools: boolean
  showSponsorLink: boolean
  readOnly: boolean
}

const InnerTldraw = React.memo(function InnerTldraw({
  id,
  autofocus,
  showPages,
  showMenu,
  showZoom,
  showStyles,
  showTools,
  showSponsorLink,
  readOnly,
  showUI,
}: InnerTldrawProps) {
  const app = useTldrawApp()

  const rWrapper = React.useRef<HTMLDivElement>(null)

  const state = app.useStore()

  const { document, settings, appState, room } = state

  const isSelecting = state.appState.activeTool === 'select'

  const page = document.pages[appState.currentPageId]
  const pageState = document.pageStates[page.id]
  const { selectedIds } = state.document.pageStates[page.id]

  const isHideBoundsShape =
    pageState.selectedIds.length === 1 &&
    TLDR.getShapeUtil(page.shapes[selectedIds[0]].type).hideBounds

  const isHideResizeHandlesShape =
    selectedIds.length === 1 &&
    TLDR.getShapeUtil(page.shapes[selectedIds[0]].type).hideResizeHandles

  const isInSession = app.session !== undefined

  // Hide bounds when not using the select tool, or when the only selected shape has handles
  const hideBounds =
    (isInSession && app.session?.constructor.name !== 'BrushSession') ||
    !isSelecting ||
    isHideBoundsShape ||
    !!pageState.editingId

  // Hide bounds when not using the select tool, or when in session
  const hideHandles = isInSession || !isSelecting

  // Hide indicators when not using the select tool, or when in session
  const hideIndicators =
    (isInSession && state.appState.status !== TDStatus.Brushing) || !isSelecting

  // Custom rendering meta, with dark mode for shapes
  const meta = React.useMemo(() => {
    return { isDarkMode: settings.isDarkMode }
  }, [settings.isDarkMode])

  // Custom theme, based on darkmode
  const theme = React.useMemo(() => {
    if (settings.isDarkMode) {
      return {
        brushFill: 'rgba(180, 180, 180, .05)',
        brushStroke: 'rgba(180, 180, 180, .25)',
        selected: 'rgba(38, 150, 255, 1.000)',
        selectFill: 'rgba(38, 150, 255, 0.05)',
        background: '#212529',
        foreground: '#49555f',
      }
    }

    return {}
  }, [settings.isDarkMode])

  // When the context menu is blurred, close the menu by sending pointer events
  // to the context menu's ref. This is a hack around the fact that certain shapes
  // stop event propagation, which causes the menu to stay open even when blurred.
  const handleMenuBlur = React.useCallback<React.FocusEventHandler>((e) => {
    const elm = rWrapper.current
    if (!elm) return
    if (!elm.contains(e.relatedTarget)) return
    elm.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    elm.dispatchEvent(new Event('pointerup', { bubbles: true }))
  }, [])

  return (
    <StyledLayout ref={rWrapper} tabIndex={-0} className={settings.isDarkMode ? dark : ''}>
      <OneOff focusableRef={rWrapper} autofocus={autofocus} />
      <ContextMenu onBlur={handleMenuBlur}>
        <Renderer
          id={id}
          containerRef={rWrapper}
          shapeUtils={shapeUtils}
          page={page}
          pageState={pageState}
          snapLines={appState.snapLines}
          users={room?.users}
          userId={room?.userId}
          theme={theme}
          meta={meta}
          hideBounds={hideBounds}
          hideHandles={hideHandles}
          hideResizeHandles={isHideResizeHandlesShape}
          hideIndicators={hideIndicators}
          hideBindingHandles={!settings.showBindingHandles}
          hideCloneHandles={!settings.showCloneHandles}
          hideRotateHandles={!settings.showRotateHandles}
          onPinchStart={app.onPinchStart}
          onPinchEnd={app.onPinchEnd}
          onPinch={app.onPinch}
          onPan={app.onPan}
          onZoom={app.onZoom}
          onPointerDown={app.onPointerDown}
          onPointerMove={app.onPointerMove}
          onPointerUp={app.onPointerUp}
          onPointCanvas={app.onPointCanvas}
          onDoubleClickCanvas={app.onDoubleClickCanvas}
          onRightPointCanvas={app.onRightPointCanvas}
          onDragCanvas={app.onDragCanvas}
          onReleaseCanvas={app.onReleaseCanvas}
          onPointShape={app.onPointShape}
          onDoubleClickShape={app.onDoubleClickShape}
          onRightPointShape={app.onRightPointShape}
          onDragShape={app.onDragShape}
          onHoverShape={app.onHoverShape}
          onUnhoverShape={app.onUnhoverShape}
          onReleaseShape={app.onReleaseShape}
          onPointBounds={app.onPointBounds}
          onDoubleClickBounds={app.onDoubleClickBounds}
          onRightPointBounds={app.onRightPointBounds}
          onDragBounds={app.onDragBounds}
          onHoverBounds={app.onHoverBounds}
          onUnhoverBounds={app.onUnhoverBounds}
          onReleaseBounds={app.onReleaseBounds}
          onPointBoundsHandle={app.onPointBoundsHandle}
          onDoubleClickBoundsHandle={app.onDoubleClickBoundsHandle}
          onRightPointBoundsHandle={app.onRightPointBoundsHandle}
          onDragBoundsHandle={app.onDragBoundsHandle}
          onHoverBoundsHandle={app.onHoverBoundsHandle}
          onUnhoverBoundsHandle={app.onUnhoverBoundsHandle}
          onReleaseBoundsHandle={app.onReleaseBoundsHandle}
          onPointHandle={app.onPointHandle}
          onDoubleClickHandle={app.onDoubleClickHandle}
          onRightPointHandle={app.onRightPointHandle}
          onDragHandle={app.onDragHandle}
          onHoverHandle={app.onHoverHandle}
          onUnhoverHandle={app.onUnhoverHandle}
          onReleaseHandle={app.onReleaseHandle}
          onError={app.onError}
          onRenderCountChange={app.onRenderCountChange}
          onShapeChange={app.onShapeChange}
          onShapeBlur={app.onShapeBlur}
          onShapeClone={app.onShapeClone}
          onBoundsChange={app.updateBounds}
          onKeyDown={app.onKeyDown}
          onKeyUp={app.onKeyUp}
        />
      </ContextMenu>
      {showUI && (
        <StyledUI>
          {settings.isFocusMode ? (
            <FocusButton onSelect={app.toggleFocusMode} />
          ) : (
            <>
              <TopPanel
                readOnly={readOnly}
                showPages={showPages}
                showMenu={showMenu}
                showStyles={showStyles}
                showZoom={showZoom}
                showSponsorLink={showSponsorLink}
              />
              <StyledSpacer />
              {showTools && !readOnly && <ToolsPanel onBlur={handleMenuBlur} />}
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

  '& input, textarea, button, select, label, button': {
    webkitTouchCallout: 'none',
    webkitUserSelect: 'none',
    '-webkit-tap-highlight-color': 'transparent',
    'tap-highlight-color': 'transparent',
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
