import createVanilla, { PartialState } from 'zustand/vanilla'
import {
  TLBoundsEventHandler,
  TLBoundsHandleEventHandler,
  TLCallbacks,
  TLCanvasEventHandler,
  TLKeyboardInfo,
  TLPage,
  TLPageState,
  TLPointerEventHandler,
  Utils,
  Vec,
} from '@tldraw/core'
import { brushUpdater } from '@tldraw/core'
import { defaultStyle, ShapeStyles, TLDrawShape, TLDrawShapeType } from '../shape'
import { Data, Session, Command, History, TLDrawStatus, ParametersExceptFirst } from './state-types'
import * as commands from './command'
import { BrushSession } from './session'
import { TLDR } from './tldr'
import { TLDrawDocument, MoveType, AlignType, StretchType, DistributeType } from '../types'

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
    selectedStyle: defaultStyle,
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
        childIndex: 1,
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

export class TLDrawState implements TLCallbacks {
  store = createVanilla<Data>(() => initialData)
  history: History = {
    stack: [],
    pointer: -1,
  }
  session?: Session
  status: { current: TLDrawStatus; previous: TLDrawStatus } = {
    current: 'idle',
    previous: 'idle',
  }
  pointedId?: string
  pointedHandle?: string
  pointedBoundshandle?: string
  currentDocumentId = 'doc'
  currentPageId = 'page'
  pages: Record<string, TLPage<TLDrawShape>> = { page: initialData.page }
  pageStates: Record<string, TLPageState> = { page: initialData.pageState }

  // Low API
  getState = this.store.getState

  setState = <T extends keyof Data>(data: Partial<Data> | ((data: Data) => Partial<Data>)) => {
    const current = this.getState()

    // Apply incoming change
    let next = typeof data === 'function' ? data(current) : data

    next = { ...current, ...next }

    if (Object.keys(current.page.shapes).length < Object.keys(next.page.shapes).length) {
      // We've deleted one or more shapes, so we may need to remove their children
      next = {
        ...next,
        page: {
          ...next.page,
          shapes: Object.fromEntries(
            Object.entries(next.page.shapes).filter(
              ([_, shape]) => shape.parentId === next.page.id || next.page.shapes[shape.parentId],
            ),
          ),
        },
      }
    }

    // Apply selected style change, if any
    const newSelectedStyle = TLDR.getSelectedStyle(next as Data)

    if (newSelectedStyle) {
      next = {
        ...next,
        appState: {
          ...current.appState,
          ...next.appState,
          selectedStyle: newSelectedStyle,
        },
      }
    }

    // Update the state
    this.store.setState(next as PartialState<Data, T, T, T>)

    // Save changes to the instance
    this.updateDocument()
  }

  getShape = <T extends TLDrawShape = TLDrawShape>(id: string): T => {
    return this.getState().page.shapes[id] as T
  }

  getPage = (id = this.currentPageId) => {
    return this.pages[id]
  }

  getPageState = (id = this.currentPageId) => {
    return this.pageStates[id]
  }

  getAppState = (id = this.currentPageId) => {
    return this.getState().appState
  }

  getPagePoint = (point: number[]) => {
    const { camera } = this.getPageState()
    return Vec.sub(Vec.div(point, camera.zoom), camera.point)
  }

  /* ----------------------- UI ----------------------- */
  toggleStylePanel = () => {
    this.setState((data) => ({
      appState: {
        ...data.appState,
        isStyleOpen: !data.appState.isStyleOpen,
      },
    }))
  }

  copy = () => {
    // TODO
  }
  paste = () => {
    // TODO
  }
  copyToSvg = () => {
    // TODO
  }
  /* -------------------- Settings -------------------- */
  togglePenMode = () => {
    this.setState((data) => ({
      settings: {
        ...data.settings,
        isPenMode: !data.settings.isPenMode,
      },
    }))
  }
  toggleDarkMode = () => {
    this.setState((data) => ({
      settings: {
        ...data.settings,
        isDarkMode: !data.settings.isDarkMode,
      },
    }))
  }
  /* --------------------- Status --------------------- */
  setStatus(status: TLDrawStatus) {
    this.status.previous = this.status.current
    this.status.current = status
  }
  /* -------------------- App State ------------------- */
  reset = () => {
    this.setState((data) => ({
      appState: {
        ...data.appState,
        ...initialData.appState,
      },
      settings: {
        ...data.appState,
        ...initialData.settings,
      },
    }))
  }

  selectTool = (tool: TLDrawShapeType | 'select') => {
    this.setState((data) => ({
      appState: {
        ...data.appState,
        activeTool: tool,
      },
    }))
  }

  toggleToolLock = () => {
    this.setState((data) => ({
      appState: {
        ...data.appState,
        isToolLocked: true,
      },
    }))
  }

  /* --------------------- Camera --------------------- */
  zoomIn = () => {
    const i = Math.round((this.store.getState().pageState.camera.zoom * 100) / 25)
    const nextZoom = TLDR.getCameraZoom((i + 1) * 0.25)
    this.zoomTo(nextZoom)
  }

  zoomOut = () => {
    const i = Math.round((this.store.getState().pageState.camera.zoom * 100) / 25)
    const nextZoom = TLDR.getCameraZoom((i - 1) * 0.25)
    this.zoomTo(nextZoom)
  }

  zoomToFit = () => {
    this.setState((data) => {
      const shapes = Object.values(data.page.shapes)

      if (shapes.length === 0) return { pageState: data.pageState }

      const bounds = Utils.getCommonBounds(Object.values(shapes).map(TLDR.getBounds))

      const zoom = TLDR.getCameraZoom(
        bounds.width > bounds.height
          ? (window.innerWidth - 128) / bounds.width
          : (window.innerHeight - 128) / bounds.height,
      )

      const mx = (window.innerWidth - bounds.width * zoom) / 2 / zoom
      const my = (window.innerHeight - bounds.height * zoom) / 2 / zoom

      return {
        pageState: {
          ...data.pageState,
          camera: {
            ...data.pageState.camera,
            point: Vec.add([-bounds.minX, -bounds.minY], [mx, my]),
            zoom,
          },
        },
      }
    })
  }

  zoomToSelection = () => {
    this.setState((data) => {
      if (TLDR.getSelectedIds(data).length === 0) return { pageState: data.pageState }

      const bounds = TLDR.getSelectedBounds(data)

      const zoom = TLDR.getCameraZoom(
        bounds.width > bounds.height
          ? (window.innerWidth - 128) / bounds.width
          : (window.innerHeight - 128) / bounds.height,
      )

      const mx = (window.innerWidth - bounds.width * zoom) / 2 / zoom
      const my = (window.innerHeight - bounds.height * zoom) / 2 / zoom

      return {
        pageState: {
          ...data.pageState,
          camera: {
            ...data.pageState.camera,
            point: Vec.add([-bounds.minX, -bounds.minY], [mx, my]),
            zoom,
          },
        },
      }
    })
  }

  resetCamera = () => {
    this.setState((data) => ({
      pageState: {
        ...data.pageState,
        camera: {
          zoom: 1,
          point: [window.innerWidth / 2, window.innerHeight / 2],
        },
      },
    }))
  }

  zoomToContent = () => {
    this.setState((data) => {
      const shapes = Object.values(data.page.shapes)

      if (shapes.length === 0) return { pageState: data.pageState }

      const bounds = Utils.getCommonBounds(Object.values(shapes).map(TLDR.getBounds))

      const { zoom } = data.pageState.camera
      const mx = (window.innerWidth - bounds.width * zoom) / 2 / zoom
      const my = (window.innerHeight - bounds.height * zoom) / 2 / zoom

      return {
        pageState: {
          ...data.pageState,
          camera: {
            ...data.pageState.camera,
            point: Vec.add([-bounds.minX, -bounds.minY], [mx, my]),
          },
        },
      }
    })
  }

  pinchZoom(point: number[], delta: number[], zoomDelta: number) {
    this.setState((data) => {
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
  }

  zoomToActual = () => {
    this.zoomTo(1)
  }

  zoomTo(next: number) {
    this.setState((data) => {
      const { zoom, point } = TLDR.getCurrentCamera(data)
      const center = [window.innerWidth / 2, window.innerHeight / 2]
      const p0 = Vec.sub(Vec.div(center, zoom), point)
      const p1 = Vec.sub(Vec.div(center, next), point)

      return {
        pageState: {
          ...data.pageState,
          camera: {
            ...data.pageState.camera,
            point: Vec.add(point, Vec.sub(p1, p0)),
            zoom: next,
          },
        },
      }
    })
  }

  zoom(delta: number) {
    const { zoom } = this.store.getState().pageState.camera
    const nextZoom = TLDR.getCameraZoom(zoom - delta * zoom)
    this.zoomTo(nextZoom)
  }

  pan(delta: number[]) {
    this.setState((data) => {
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
  }

  /* ---------------------- Document --------------------- */
  loadDocument = (document: TLDrawDocument) => {
    this.currentDocumentId = document.id
    this.pages = Utils.deepClone(document.pages)
    this.pageStates = Utils.deepClone(document.pageStates)
    this.currentPageId = Object.values(this.pages)[0].id
    this.setState({
      page: this.pages[this.currentPageId],
      pageState: this.pageStates[this.currentPageId],
    })
  }

  updateDocument = () => {
    const { page, pageState } = this.getState()
    this.pages[page.id] = page
    this.pageStates[page.id] = pageState
  }
  setCurrentPageId(pageId: string) {
    if (pageId === this.currentPageId) return
    this.currentPageId = pageId

    this.setState({
      page: this.pages[pageId],
      pageState: this.pageStates[pageId],
    })
  }
  /* -------------------- Selection ------------------- */
  setSelectedIds(ids: string[], push = false) {
    this.setState((data) => {
      return {
        pageState: {
          ...data.pageState,
          selectedIds: push ? [...data.pageState.selectedIds, ...ids] : [...ids],
        },
      }
    })
  }
  select = (...ids: string[]) => {
    this.setSelectedIds(ids)
  }
  selectAll = () => {
    this.setSelectedIds(Object.keys(this.getState().page.shapes))
  }
  deselectAll = () => {
    this.setSelectedIds([])
  }
  /* ----------------- Shape Functions ---------------- */
  style = (style: Partial<ShapeStyles>, ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(commands.style(data, idsToMutate, style))
  }
  align = (type: AlignType, ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(commands.align(data, idsToMutate, type))
  }
  distribute = (type: DistributeType, ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(commands.distribute(data, idsToMutate, type))
  }
  stretch = (type: StretchType, ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(commands.stretch(data, idsToMutate, type))
  }
  moveToBack = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(commands.move(data, idsToMutate, MoveType.ToBack))
  }
  moveBackward = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(commands.move(data, idsToMutate, MoveType.Backward))
  }
  moveForward = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(commands.move(data, idsToMutate, MoveType.Forward))
  }
  moveToFront = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(commands.move(data, idsToMutate, MoveType.ToFront))
  }
  nudge = (delta: number[], isMajor = false, ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(commands.translate(data, idsToMutate, Vec.mul(delta, isMajor ? 10 : 1)))
  }
  duplicate = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(commands.duplicate(data, idsToMutate))
  }
  toggleHidden = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(commands.toggle(data, idsToMutate, 'isHidden'))
  }
  toggleLocked = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(commands.toggle(data, idsToMutate, 'isLocked'))
  }
  toggleAspectRatioLocked = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(commands.toggle(data, idsToMutate, 'isAspectRatioLocked'))
  }
  rotate = (delta = Math.PI * -0.5, ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(commands.rotate(data, idsToMutate))
  }
  group = (ids?: string[]) => {
    // TODO
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(commands.toggle(data, idsToMutate, 'isAspectRatioLocked'))
  }
  delete = (ids?: string[]) => {
    // TODO
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(commands.deleteShapes(data, idsToMutate))
  }
  clear = () => {
    this.selectAll()
    this.delete()
  }
  cancel = () => {
    // TODO
  }
  save = () => {
    // TODO
  }
  /* -------------------- Sessions -------------------- */
  startSession<T extends Session>(session: T, ...args: ParametersExceptFirst<T['start']>) {
    this.session = session
    this.setState((data) => this.session.start(data, ...args))
  }
  updateSession<T extends Session>(...args: ParametersExceptFirst<T['update']>) {
    this.setState((data) => this.session.update(data, ...args))
  }
  cancelSession<T extends Session>(...args: ParametersExceptFirst<T['cancel']>) {
    this.setState((data) => this.session.cancel(data, ...args))
    this.session = undefined
  }
  breakSession<T extends Session>(...args: ParametersExceptFirst<T['cancel']>) {
    this.setState((data) => this.session.cancel(data, ...args))
    // this.delete()
    this.session = undefined
  }
  completeSession<T extends Session>(...args: ParametersExceptFirst<T['complete']>) {
    const result = this.session.complete(this.store.getState(), ...args)

    this.setStatus('idle')

    if ('after' in result) {
      this.do(result)
      return
    }

    this.setState(() => result)
    this.updateDocument()
  }
  /* -------------------- Commands -------------------- */
  do(command: Command) {
    const { history } = this
    if (history.pointer !== history.stack.length - 1) {
      history.stack = history.stack.slice(0, history.pointer + 1)
    }
    history.stack.push(command)
    history.pointer = history.stack.length - 1

    this.setState((data) => {
      let tdata = Utils.deepMerge<Data>(data, history.stack[history.pointer].after)
      if (Object.values(tdata.page.shapes).includes(undefined)) {
        tdata = {
          ...tdata,
          page: {
            ...tdata.page,
            shapes: Object.fromEntries(
              Object.values(tdata.page.shapes)
                .filter(Boolean)
                .map((shape) => [shape.id, shape]),
            ),
          },
        }
      }

      return tdata
    })

    this.updateDocument()
  }
  undo = () => {
    const { history } = this
    if (history.pointer <= -1) return

    this.setState((data) => {
      let tdata = Utils.deepMerge<Data>(data, history.stack[history.pointer].before)

      if (Object.values(tdata.page.shapes).includes(undefined)) {
        tdata = {
          ...tdata,
          page: {
            ...tdata.page,
            shapes: Object.fromEntries(
              Object.values(tdata.page.shapes)
                .filter(Boolean)
                .map((shape) => [shape.id, shape]),
            ),
          },
        }
      }

      return tdata
    })
    history.pointer--

    this.updateDocument()
  }
  redo = () => {
    const { history } = this
    if (history.pointer >= history.stack.length - 1) return
    history.pointer++

    this.setState((data) => {
      const command = history.stack[history.pointer]
      let tdata = Utils.deepMerge<Data>(data, command.after)
      if (Object.values(tdata.page.shapes).includes(undefined)) {
        tdata = {
          ...tdata,
          page: {
            ...tdata.page,
            shapes: Object.fromEntries(
              Object.values(tdata.page.shapes)
                .filter(Boolean)
                .map((shape) => [shape.id, shape]),
            ),
          },
        }
      }

      return tdata
    })

    this.updateDocument()
  }
  /* -------------------- Sessions -------------------- */
  startBrushSession = (point: number[]) => {
    this.setStatus('brushing')
    this.startSession(new BrushSession(this.store.getState(), point))
  }
  updateBrushSession = (point: number[]) => {
    this.session.complete(this.store.getState())
    this.updateSession<BrushSession>(point)
  }
  /* --------------------- Events --------------------- */
  onKeyDown = (key: string, info: TLKeyboardInfo) => {
    // TODO
  }
  onKeyUp = (key: string, info: TLKeyboardInfo) => {
    // TODO
  }
  /* ------------- Renderer Event Handlers ------------ */
  onPinchStart: TLPointerEventHandler = (info) => {
    // TODO
  }
  onPinchEnd: TLPointerEventHandler = () => {
    // TODO
  }
  onPinch: TLPointerEventHandler = (info) => {
    this.pinchZoom(info.origin, Vec.sub(info.point, info.origin), info.delta[1] / 350)
  }
  onPan: TLPointerEventHandler = (info) => {
    this.pan(info.delta)
  }
  onZoom: TLPointerEventHandler = (info) => {
    this.zoom(info.delta[1] / 100)
  }

  // Pointer Events
  onPointerMove: TLPointerEventHandler = (info) => {
    if (this.status.current === 'brushing') {
      // If the user is brushing, update the brush session
      this.updateBrushSession(this.getPagePoint(info.point))
    }
  }
  onPointerUp: TLPointerEventHandler = () => {
    if (this.status.current === 'brushing') {
      // If the user is brushing, complete the brush session
      this.completeSession<BrushSession>()
      brushUpdater.clear()
    }
  }
  // Canvas (background)
  onPointCanvas: TLCanvasEventHandler = (info) => {
    if (this.status.current === 'idle') {
      // Unless the user is holding shift or meta, clear the current selection
      if (!(info.shiftKey || info.metaKey)) {
        this.deselectAll()
      }

      // Start a brush session
      this.startBrushSession(this.getPagePoint(info.point))
    }
  }
  onDoublePointCanvas: TLCanvasEventHandler = () => {
    // Unused
  }
  onRightPointCanvas: TLCanvasEventHandler = () => {
    // Unused
  }
  onDragCanvas: TLCanvasEventHandler = () => {
    // Unused
  }
  onReleaseCanvas: TLCanvasEventHandler = () => {
    // Unused
  }

  // Shape
  onPointShape: TLPointerEventHandler = (info) => {
    const data = this.getState()
    if (this.status.current === 'idle') {
      if (info.metaKey) {
        // While holding command key, start brush session without deselecting shapes
        this.startBrushSession(this.getPagePoint(info.point))
        return
      }

      if (!data.pageState.selectedIds.includes(info.target)) {
        // Set the pointed ID to the shape that was clicked.
        this.pointedId = info.target

        // If the shape is not selected; then if the user is pressing shift,
        // add the shape to the current selection; otherwise, set the shape as
        // the only selected shape.
        this.setSelectedIds([info.target], info.shiftKey)
      }
    }
  }

  onReleaseShape: TLPointerEventHandler = (info) => {
    const data = this.getState()
    if (data.pageState.selectedIds.includes(info.target)) {
      // If we did not just shift-select the shape, and if the shape is selected;
      // then if user is pressing shift, remove the shape from the current
      // selection; otherwise, set the shape as the only selected shape.
      if (this.pointedId !== info.target) {
        if (info.shiftKey) {
          this.setSelectedIds(data.pageState.selectedIds.filter((id) => id !== info.target))
        } else {
          this.setSelectedIds([info.target])
        }
      }
    }

    // Clear the pointed ID
    this.pointedId = undefined
  }

  onDoublePointShape: TLPointerEventHandler = () => {
    // TODO
  }

  onRightPointShape: TLPointerEventHandler = () => {
    // TODO
  }

  onDragShape: TLPointerEventHandler = () => {
    // TODO
  }

  onHoverShape: TLPointerEventHandler = () => {
    // TODO
  }

  onUnhoverShape: TLPointerEventHandler = () => {
    // TODO
  }

  // Bounds (bounding box background)
  onPointBounds: TLBoundsEventHandler = () => {
    // TODO
  }

  onDoublePointBounds: TLBoundsEventHandler = () => {
    // TODO
  }

  onRightPointBounds: TLBoundsEventHandler = () => {
    // TODO
  }

  onDragBounds: TLBoundsEventHandler = () => {
    // TODO
  }

  onHoverBounds: TLBoundsEventHandler = () => {
    // TODO
  }

  onUnhoverBounds: TLBoundsEventHandler = () => {
    // TODO
  }

  onReleaseBounds: TLBoundsEventHandler = () => {
    // TODO
  }

  // Bounds handles (corners, edges)
  onPointBoundsHandle: TLBoundsHandleEventHandler = () => {
    // TODO
  }

  onDoublePointBoundsHandle: TLBoundsHandleEventHandler = () => {
    // TODO
  }

  onRightPointBoundsHandle: TLBoundsHandleEventHandler = () => {
    // TODO
  }

  onDragBoundsHandle: TLBoundsHandleEventHandler = () => {
    // TODO
  }

  onHoverBoundsHandle: TLBoundsHandleEventHandler = () => {
    // TODO
  }

  onUnhoverBoundsHandle: TLBoundsHandleEventHandler = () => {
    // TODO
  }

  onReleaseBoundsHandle: TLBoundsHandleEventHandler = () => {
    // TODO
  }

  // Handles (ie the handles of a selected arrow)
  onPointHandle: TLPointerEventHandler = () => {
    // TODO
  }

  onDoublePointHandle: TLPointerEventHandler = () => {
    // TODO
  }

  onRightPointHandle: TLPointerEventHandler = () => {
    // TODO
  }

  onDragHandle: TLPointerEventHandler = () => {
    // TODO
  }

  onHoverHandle: TLPointerEventHandler = () => {
    // TODO
  }

  onUnhoverHandle: TLPointerEventHandler = () => {
    // TODO
  }

  onReleaseHandle: TLPointerEventHandler = () => {
    // TODO
  }

  onChange = (ids: string[]) => {
    const appState = this.getAppState()
    if (appState.isEmptyCanvas && ids.length > 0) {
      this.setState((data) => ({
        appState: {
          ...data.appState,
          isEmptyCanvas: false,
        },
      }))
    } else if (!appState.isEmptyCanvas && ids.length <= 0) {
      this.setState((data) => ({
        appState: {
          ...data.appState,
          isEmptyCanvas: true,
        },
      }))
    }
  }

  onError = (error: Error) => {
    // TODO
  }

  onBlurEditingShape = () => {
    // TODO
  }
}
