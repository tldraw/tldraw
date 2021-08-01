import { AlignType, DistributeType, StretchType, Utils, Vec } from '@tldraw/core'
import { brushUpdater } from '@tldraw/core'
import { defaultStyle, TLDrawShapeType } from '../../shape'
import createVanilla from 'zustand/vanilla'
import createReact from 'zustand'
import { TLDrawState, Data, Session, Command, TLDrawStatus } from './state-types'
import * as commands from './command'
import { BrushSession } from './session'
import { TLDR } from './tldr'
import { TLDrawDocument } from '../../types'

const initialData: Data = {
  settings: {
    isPenMode: false,
    isDarkMode: false,
    isDebugMode: process.env.NODE_ENV === 'development',
    isReadonlyMode: false,
    nudgeDistanceLarge: 10,
    nudgeDistanceSmall: 1,
  },
  appState: {
    activeToolType: undefined,
    activeTool: 'select',
    currentPageId: 'page',
    currentStyle: defaultStyle,
    isToolLocked: false,
    isStyleOpen: false,
    isEmptyCanvas: false,
  },
  page: {
    id: 'page',
    shapes: {
      rect1: {
        id: 'rect1',
        parentId: 'page',
        name: 'Rectangle',
        childIndex: 0,
        type: TLDrawShapeType.Rectangle,
        point: [32, 32],
        size: [100, 100],
        style: defaultStyle,
      },
    },
    bindings: {
      // TODO
    },
  },
  pageState: {
    id: 'page',
    selectedIds: [],
    camera: {
      point: [0, 0],
      zoom: 1,
    },
  },
}

const store = createVanilla<Data>((set, get, str) => initialData)

const { setState } = store

const initialState = store.getState()

export const tlstate: TLDrawState = {
  store,
  history: {
    stack: [],
    pointer: -1,
  },
  session: undefined,
  status: {
    current: 'idle',
    previous: 'idle',
  },
  currentDocumentId: 'doc',
  currentPageId: 'page',
  pages: { page: initialState.page },
  pageStates: { page: initialState.pageState },

  /* ----------------------- UI ----------------------- */
  toggleStylePanel() {
    setState((data) => ({
      appState: {
        ...data.appState,
        isStyleOpen: !data.appState.isStyleOpen,
      },
    }))
  },
  copy() {
    // TODO
  },
  paste() {
    // TODO
  },
  copyToSvg() {
    // TODO
  },
  /* --------------------- Status --------------------- */
  setStatus(status: TLDrawStatus) {
    this.status.previous = this.status.current
    this.status.current = status
  },
  /* ---------------------- Tools --------------------- */
  selectTool(tool) {
    // TODO
  },
  /* --------------------- Camera --------------------- */
  zoomIn() {
    // TODO
  },
  zoomOut() {
    // TODO
  },
  zoomToFit() {
    // TODO
  },
  zoomToSelection() {
    // TODO
  },
  resetCamera() {
    // TODO
  },
  pinchZoom(point: number[], delta: number[], zoomDelta: number) {
    setState((data) => {
      const { camera } = data.pageState
      const nextPoint = Vec.sub(camera.point, Vec.div(delta, camera.zoom))
      const nextZoom = TLDR.getCameraZoom(camera.zoom - zoomDelta * camera.zoom)
      const p0 = Vec.sub(Vec.div(point, camera.zoom), nextPoint)
      const p1 = Vec.sub(Vec.div(point, nextZoom), nextPoint)

      return {
        pageState: {
          ...data.pageState,
          camera: {
            ...data.pageState.camera,
            point: Vec.add(nextPoint, Vec.sub(p1, p0)),
            zoom: nextZoom,
          },
        },
      }
    })
  },
  zoom(delta: number) {
    setState((data) => {
      const { zoom, point } = TLDR.getCurrentCamera(data)
      const nextZoom = TLDR.getCameraZoom(zoom - delta * zoom)
      const center = [window.innerWidth / 2, window.innerHeight / 2]
      const p0 = Vec.sub(Vec.div(center, zoom), point)
      const p1 = Vec.sub(Vec.div(center, nextZoom), point)

      return {
        pageState: {
          ...data.pageState,
          camera: {
            ...data.pageState.camera,
            point: Vec.add(point, Vec.sub(p1, p0)),
            zoom: nextZoom,
          },
        },
      }
    })
  },
  pan(delta: number[]) {
    setState((data) => {
      const { point, zoom } = TLDR.getCurrentCamera(data)

      return {
        pageState: {
          ...data.pageState,
          camera: {
            ...data.pageState.camera,
            point: Vec.sub(point, Vec.div(delta, zoom)),
          },
        },
      }
    })
  },
  /* ---------------------- Document --------------------- */
  loadDocument(document: TLDrawDocument) {
    this.currentDocumentId = document.id
    this.pages = document.pages
    this.pageStates = document.pageStates
    this.setCurrentPageId(Object.values(document.pages)[0].id)
  },
  setCurrentPageId(pageId: string) {
    if (pageId === this.currentPageId) return
    this.currentPageId = pageId
    this.store.setState({
      page: this.pages[pageId],
      pageState: this.pageStates[pageId],
    })
  },
  /* -------------------- Selection ------------------- */
  setSelectedIds(ids: string[]) {
    setState((state) => ({
      pageState: {
        ...state.pageState,
        selectedIds: ids.filter((id) => state.page.shapes[id] !== undefined),
      },
    }))
  },
  selectAll() {
    setState((state) => ({
      pageState: {
        ...state.pageState,
        selectedIds: [...Object.keys(state.page.shapes)],
      },
    }))
  },
  deselectAll() {
    setState((state) => ({
      pageState: {
        ...state.pageState,
        selectedIds: [],
      },
    }))
  },
  /* ----------------- Shape Functions ---------------- */

  align(type: AlignType) {
    this.do(commands.align(this.store.getState(), type))
  },
  distribute(type: DistributeType) {
    this.do(commands.distribute(this.store.getState(), type))
  },
  stretch(type: StretchType) {
    // this.do(commands.stretch(this.store.getState(), type))
  },
  /* -------------------- Sessions -------------------- */
  startSession(session: Session, ...args) {
    this.session = session
    setState((data) => this.session.start(data, ...args))
  },
  updateSession(...args) {
    setState((data) => this.session.update(data, ...args))
  },
  cancelSession(...args) {
    setState((data) => this.session.cancel(data, ...args))
    this.session = undefined
  },
  breakSession(...args) {
    setState((data) => this.session.cancel(data, ...args))
    // this.delete()
    this.session = undefined
  },
  completeSession(...args) {
    const result = this.session.complete(this.store.getState(), ...args)

    this.setStatus('idle')

    if ('after' in result) {
      this.do(result)
      return
    }

    setState(() => result)
  },
  /* -------------------- Commands -------------------- */
  do(command: Command) {
    const { history } = this
    if (history.pointer !== history.stack.length - 1) {
      history.stack = history.stack.slice(0, history.pointer)
    }
    history.stack.push(command)
    history.pointer++
    setState((data) => Utils.deepMerge<Data>(data, history.stack[history.pointer].after))
  },
  undo() {
    const { history } = this
    if (history.pointer <= -1) return
    setState((data) => Utils.deepMerge<Data>(data, history.stack[history.pointer].before))
    history.pointer--
  },
  redo() {
    const { history } = this
    if (history.pointer >= history.stack.length - 1) return
    history.pointer++
    setState((data) => Utils.deepMerge<Data>(data, history.stack[history.pointer].after))
  },
  /* -------------------- Sessions -------------------- */
  startBrushSession(point: number[]) {
    this.deselectAll()
    this.setStatus('brushing')
    this.startSession(new BrushSession(this.store.getState(), point))
  },
  updateBrushSession(point: number[]) {
    this.session.complete(this.store.getState())
    this.updateSession<BrushSession>(point)
    brushUpdater.set(this.store.getState().pageState.brush)
  },

  /* ------------- Renderer Event Handlers ------------ */
  onPinchStart(info) {
    // TODO
  },
  onPinchEnd() {
    // TODO
  },
  onPinch(info) {
    this.pinchZoom(info.origin, Vec.sub(info.point, info.origin), info.delta[1] / 350)
  },
  onPan(info) {
    this.pan(info.delta)
  },
  onZoom(info) {
    this.zoom(info.delta[1] / 100)
  },

  // Pointer Events
  onPointerMove(info) {
    if (this.status.current === 'brushing') {
      const data = this.store.getState()
      this.updateBrushSession(TLDR.screenToWorld(data, info.point))
    }
  },
  onPointerUp() {
    if (this.status.current === 'brushing') {
      this.completeSession<BrushSession>()
      brushUpdater.clear()
    }
  },
  // Canvas (background)
  onPointCanvas(info) {
    if (this.status.current === 'idle') {
      const data = this.store.getState()
      this.startBrushSession(TLDR.screenToWorld(data, info.point))
    }
  },
  onDoublePointCanvas() {
    // Unused
  },
  onRightPointCanvas() {
    // Unused
  },
  onDragCanvas() {
    // Unused
  },
  onReleaseCanvas() {
    // Unused
  },

  // Shape
  onPointShape(info) {
    if (info.metaKey && this.status.current === 'idle') {
      const data = this.store.getState()
      const point = TLDR.screenToWorld(data, info.point)
      this.startBrushSession(point)
    }
  },
  onDoublePointShape() {
    // TODO
  },
  onRightPointShape() {
    // TODO
  },
  onDragShape() {
    // TODO
  },
  onHoverShape() {
    // TODO
  },
  onUnhoverShape() {
    // TODO
  },
  onReleaseShape() {
    // TODO
  },

  // Bounds (bounding box background)
  onPointBounds() {
    // TODO
  },
  onDoublePointBounds() {
    // TODO
  },
  onRightPointBounds() {
    // TODO
  },
  onDragBounds() {
    // TODO
  },
  onHoverBounds() {
    // TODO
  },
  onUnhoverBounds() {
    // TODO
  },
  onReleaseBounds() {
    // TODO
  },

  // Bounds handles (corners, edges)
  onPointBoundsHandle() {
    // TODO
  },
  onDoublePointBoundsHandle() {
    // TODO
  },
  onRightPointBoundsHandle() {
    // TODO
  },
  onDragBoundsHandle() {
    // TODO
  },
  onHoverBoundsHandle() {
    // TODO
  },
  onUnhoverBoundsHandle() {
    // TODO
  },
  onReleaseBoundsHandle() {
    // TODO
  },

  // Handles (ie the handles of a selected arrow)
  onPointHandle() {
    // TODO
  },
  onDoublePointHandle() {
    // TODO
  },
  onRightPointHandle() {
    // TODO
  },
  onDragHandle() {
    // TODO
  },
  onHoverHandle() {
    // TODO
  },
  onUnhoverHandle() {
    // TODO
  },
  onReleaseHandle() {
    // TODO
  },

  onChange() {
    // TODO
  },
  onError() {
    // TODO
  },
  onBlurEditingShape() {
    // TODO
  },
}

export const useAppState = createReact<Data>(store)
