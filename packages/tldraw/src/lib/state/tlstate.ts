import createReact, { PartialState } from 'zustand'
import {
  TLBoundsCorner,
  TLBoundsEdge,
  TLBoundsEventHandler,
  TLBoundsHandleEventHandler,
  TLCallbacks,
  TLCanvasEventHandler,
  TLKeyboardInfo,
  TLPage,
  TLPageState,
  TLPinchEventHandler,
  TLPointerEventHandler,
  TLWheelEventHandler,
  Utils,
  Vec,
} from '@tldraw/core'
import { brushUpdater } from '@tldraw/core'
import { defaultStyle, ShapeStyles, TLDrawShape, TLDrawShapeType } from '../shape'
import { Data, Session, Command, History, TLDrawStatus, ParametersExceptFirst } from './state-types'
import * as commands from './command'
import {
  BrushSession,
  TransformSingleSession,
  RotateSession,
  DrawSession,
  TranslateSession,
  TransformSession,
} from './session'
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
    hoveredId: undefined,
    currentPageId: 'page',
    pages: [{ id: 'page' }],
    currentStyle: defaultStyle,
    selectedStyle: defaultStyle,
    isToolLocked: false,
    isStyleOpen: false,
    isEmptyCanvas: false,
  },
  page: {
    id: 'page',
    childIndex: 1,
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
  store = createReact<Data>(() => initialData)
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
  pointedBoundsHandle?: TLBoundsCorner | TLBoundsEdge | 'rotate'
  currentDocumentId = 'doc'
  currentPageId = 'page'
  pages: Record<string, TLPage<TLDrawShape>> = { page: initialData.page }
  pageStates: Record<string, TLPageState> = { page: initialData.pageState }

  // Low API
  getState = this.store.getState

  setState = <T extends keyof Data>(data: Partial<Data> | ((data: Data) => Partial<Data>)) => {
    const current = this.getState()

    // Apply incoming change
    let result = typeof data === 'function' ? data(current) : data

    let next = { ...current, ...result }

    if ('page' in result) {
      next.page = {
        ...next.page,
        shapes: Object.fromEntries(
          Object.entries(next.page.shapes).filter(([_, shape]) => {
            return shape && (shape.parentId === next.page.id || next.page.shapes[shape.parentId])
          }),
        ),
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

    this.store.setState(next as PartialState<Data, T, T, T>)
    this.pages[next.page.id] = next.page
    this.pageStates[next.page.id] = next.pageState

    return this
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
    return this
  }

  copy = () => {
    // TODO
    return this
  }
  paste = () => {
    // TODO
    return this
  }
  copyToSvg = () => {
    // TODO
    return this
  }
  /* -------------------- Settings -------------------- */
  togglePenMode = () => {
    this.setState((data) => ({
      settings: {
        ...data.settings,
        isPenMode: !data.settings.isPenMode,
      },
    }))
    return this
  }
  toggleDarkMode = () => {
    this.setState((data) => ({
      settings: {
        ...data.settings,
        isDarkMode: !data.settings.isDarkMode,
      },
    }))
    return this
  }
  /* --------------------- Status --------------------- */
  setStatus(status: TLDrawStatus) {
    this.status.previous = this.status.current
    this.status.current = status
    return this
    // console.log(this.status.previous, ' -> ', this.status.current)
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
    return this
  }

  selectTool = (tool: TLDrawShapeType | 'select') => {
    this.setState((data) => ({
      appState: {
        ...data.appState,
        activeTool: tool,
        activeToolType:
          tool === 'select' ? 'select' : TLDR.getShapeUtils({ type: tool } as TLDrawShape).toolType,
      },
    }))
    return this
  }

  toggleToolLock = () => {
    this.setState((data) => ({
      appState: {
        ...data.appState,
        isToolLocked: true,
      },
    }))
    return this
  }

  /* --------------------- Camera --------------------- */
  zoomIn = () => {
    const i = Math.round((this.store.getState().pageState.camera.zoom * 100) / 25)
    const nextZoom = TLDR.getCameraZoom((i + 1) * 0.25)
    this.zoomTo(nextZoom)
    return this
  }

  zoomOut = () => {
    const i = Math.round((this.store.getState().pageState.camera.zoom * 100) / 25)
    const nextZoom = TLDR.getCameraZoom((i - 1) * 0.25)
    this.zoomTo(nextZoom)
    return this
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
    return this
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
    return this
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
    return this
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
    return this
  }

  pinchZoom(point: number[], delta: number[], zoomDelta: number) {
    this.setState((data) => {
      const { camera } = data.pageState
      const nextPoint = Vec.add(camera.point, Vec.div(delta, camera.zoom))
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
    return this
  }

  zoomToActual = () => {
    this.zoomTo(1)
    return this
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
    return this
  }

  zoom(delta: number) {
    const { zoom } = this.store.getState().pageState.camera
    const nextZoom = TLDR.getCameraZoom(zoom - delta * zoom)
    this.zoomTo(nextZoom)
    return this
  }

  pan(delta: number[]) {
    this.setState((data) => {
      const { point } = TLDR.getCurrentCamera(data)

      return {
        pageState: {
          ...data.pageState,
          camera: {
            ...data.pageState.camera,
            point: Vec.sub(point, delta),
          },
        },
      }
    })
    return this
  }

  /* ---------------------- Document --------------------- */
  loadDocument = (document: TLDrawDocument) => {
    this.currentDocumentId = document.id
    this.pages = Utils.deepClone(document.pages)
    this.pageStates = Utils.deepClone(document.pageStates)
    this.currentPageId = Object.values(this.pages)[0].id
    this.setState((data) => ({
      page: this.pages[this.currentPageId],
      pageState: this.pageStates[this.currentPageId],
      appState: {
        ...data.appState,
        pageIds: Object.values(this.pages)
          .sort((a, b) => a.childIndex - b.childIndex)
          .map((page) => page.id),
      },
    }))
    return this
  }

  setCurrentPageId(pageId: string) {
    if (pageId === this.currentPageId) return this

    this.currentPageId = pageId

    this.setState({
      page: this.pages[pageId],
      pageState: this.pageStates[pageId],
    })
    return this
  }

  /* -------------------- Sessions -------------------- */
  startSession<T extends Session>(session: T, ...args: ParametersExceptFirst<T['start']>) {
    this.session = session
    this.setState((data) => this.session.start(data, ...args))
    return this
  }

  updateSession<T extends Session>(...args: ParametersExceptFirst<T['update']>) {
    this.setState((data) => this.session.update(data, ...args))
    return this
  }

  cancelSession<T extends Session>(...args: ParametersExceptFirst<T['cancel']>) {
    this.setState((data) => this.session.cancel(data, ...args))
    this.setStatus('idle')
    this.session = undefined
    return this
  }

  completeSession<T extends Session>(...args: ParametersExceptFirst<T['complete']>) {
    this.setStatus('idle')
    const result = this.session.complete(this.store.getState(), ...args)

    if ('after' in result) {
      this.do(result)
    } else {
      this.setState((data) => Utils.deepMerge<Data>(data, result))
    }

    const { isToolLocked, activeTool } = this.appState

    if (!isToolLocked && activeTool !== 'draw') {
      this.selectTool('select')
    }

    this.session = undefined
    return this
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

    return this
  }

  undo = () => {
    const { history } = this
    if (history.pointer <= -1) return this

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

    return this
  }

  redo = () => {
    const { history } = this
    if (history.pointer >= history.stack.length - 1) return this
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

    return this
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
    return this
  }

  select = (...ids: string[]) => {
    this.setSelectedIds(ids)
    return this
  }

  selectAll = () => {
    this.setSelectedIds(Object.keys(this.getState().page.shapes))
    return this
  }

  deselectAll = () => {
    this.setSelectedIds([])
    return this
  }

  /* ----------------- Shape Functions ---------------- */
  style = (style: Partial<ShapeStyles>, ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(commands.style(data, idsToMutate, style))
    return this
  }

  align = (type: AlignType, ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(commands.align(data, idsToMutate, type))
    return this
  }

  distribute = (type: DistributeType, ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(commands.distribute(data, idsToMutate, type))
    return this
  }

  stretch = (type: StretchType, ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(commands.stretch(data, idsToMutate, type))
    return this
  }

  moveToBack = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(commands.move(data, idsToMutate, MoveType.ToBack))
    return this
  }

  moveBackward = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(commands.move(data, idsToMutate, MoveType.Backward))
    return this
  }

  moveForward = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(commands.move(data, idsToMutate, MoveType.Forward))
    return this
  }

  moveToFront = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(commands.move(data, idsToMutate, MoveType.ToFront))
    return this
  }

  nudge = (delta: number[], isMajor = false, ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(commands.translate(data, idsToMutate, Vec.mul(delta, isMajor ? 10 : 1)))
    return this
  }

  duplicate = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(commands.duplicate(data, idsToMutate))
    return this
  }

  toggleHidden = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(commands.toggle(data, idsToMutate, 'isHidden'))
    return this
  }

  toggleLocked = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(commands.toggle(data, idsToMutate, 'isLocked'))
    return this
  }

  toggleAspectRatioLocked = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(commands.toggle(data, idsToMutate, 'isAspectRatioLocked'))
    return this
  }

  rotate = (delta = Math.PI * -0.5, ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(commands.rotate(data, idsToMutate, delta))
    return this
  }

  group = (ids?: string[]) => {
    // TODO
    // const data = this.store.getState()
    // const idsToMutate = ids ? ids : data.pageState.selectedIds
    // this.do(commands.toggle(data, idsToMutate, 'isAspectRatioLocked'))
    return this
  }

  create = (...shapes: TLDrawShape[]) => {
    const data = this.store.getState()
    this.do(commands.create(data, shapes))
    return this
  }

  delete = (ids?: string[]) => {
    // TODO: Handle changes to parents for grouped shapes?
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(commands.deleteShapes(data, idsToMutate))
    return this
  }

  clear = () => {
    this.selectAll()
    this.delete()
    return this
  }

  cancel = () => {
    switch (this.status.current) {
      case 'idle': {
        this.deselectAll()
        this.selectTool('select')
        break
      }
      case 'brushing': {
        this.cancelSession()
        brushUpdater.clear()
        break
      }
      case 'translating': {
        this.cancelSession()
        break
      }
      case 'transforming': {
        this.cancelSession()
        break
      }
      case 'rotating': {
        this.cancelSession()
        break
      }
      case 'creating': {
        this.cancelSession()
        this.delete()
        break
      }
    }

    return this
  }

  save = () => {
    // TODO
    return this
  }
  /* -------------------- Sessions -------------------- */
  startBrushSession = (point: number[]) => {
    this.setStatus('brushing')
    this.startSession(new BrushSession(this.store.getState(), point))
    return this
  }

  updateBrushSession = (point: number[], metaKey = false) => {
    this.updateSession<BrushSession>(point, metaKey)
    return this
  }

  startTranslateSession = (point: number[]) => {
    this.setStatus('translating')
    this.startSession(new TranslateSession(this.store.getState(), point))
    return this
  }

  updateTranslateSession = (point: number[], shiftKey = false, altKey = false) => {
    this.updateSession<TranslateSession>(point, shiftKey, altKey)
    return this
  }

  startTransformSession = (point: number[], handle: TLBoundsCorner | TLBoundsEdge | 'rotate') => {
    const { selectedIds } = this

    if (selectedIds.length === 0) return this

    this.setStatus('transforming')

    this.pointedBoundsHandle = handle

    if (this.pointedBoundsHandle === 'rotate') {
      this.startSession(new RotateSession(this.store.getState(), point))
    } else if (this.selectedIds.length === 1) {
      this.startSession(
        new TransformSingleSession(this.store.getState(), point, this.pointedBoundsHandle),
      )
    } else {
      this.startSession(
        new TransformSession(this.store.getState(), point, this.pointedBoundsHandle),
      )
    }
    return this
  }

  updateTransformSession = (point: number[], shiftKey = false, altKey = false) => {
    this.updateSession<TransformSingleSession | TransformSession>(point, shiftKey, altKey)
    return this
  }

  startDrawSession = (id: string, point: number[]) => {
    this.setStatus('creating')
    this.startSession(new DrawSession(this.store.getState(), id, point))
    return this
  }

  updateDrawSession = (point: number[], pressure: number, shiftKey = false) => {
    this.updateSession<DrawSession>(point, pressure, shiftKey)
    return this
  }

  updateSessionsOnPointerMove: TLPointerEventHandler = (info) => {
    switch (this.status.current) {
      case 'pointingBoundsHandle': {
        if (Vec.dist(info.origin, info.point) > 4) {
          this.setStatus('transforming')
          this.startTransformSession(this.getPagePoint(info.origin), this.pointedBoundsHandle)
        }
        break
      }
      case 'pointingBounds': {
        if (Vec.dist(info.origin, info.point) > 4) {
          this.setStatus('translating')
          this.startTranslateSession(this.getPagePoint(info.origin))
        }
        break
      }
      case 'brushing': {
        this.updateBrushSession(this.getPagePoint(info.point), info.metaKey)
        break
      }
      case 'translating': {
        this.updateTranslateSession(this.getPagePoint(info.point), info.shiftKey, info.altKey)
        break
      }
      case 'transforming': {
        this.updateTransformSession(this.getPagePoint(info.point), info.shiftKey, info.altKey)
        break
      }
      case 'creating': {
        switch (this.appState.activeToolType) {
          case 'draw': {
            this.updateDrawSession(this.getPagePoint(info.point), info.pressure, info.shiftKey)
            break
          }
          case 'bounds': {
            this.updateTransformSession(this.getPagePoint(info.point), info.shiftKey)
            break
          }
          case 'point': {
            break
          }
          case 'points': {
            break
          }
        }
        break
      }
    }
  }

  createActiveToolShape(point: number[]) {
    const id = Utils.uniqueId()
    const pagePoint = Vec.round(this.getPagePoint(point))

    this.setState((data) => {
      const { activeTool, activeToolType } = data.appState

      if (activeTool === 'select') return data

      if (!activeToolType) throw Error

      const utils = TLDR.getShapeUtils({ type: activeTool } as TLDrawShape)

      const shapes = Object.values(data.page.shapes)

      const childIndex =
        shapes.length === 0
          ? 1
          : shapes.sort((a, b) => b.childIndex - a.childIndex)[0].childIndex + 1

      return {
        page: {
          ...data.page,
          shapes: {
            ...data.page.shapes,
            [id]: utils.create({
              id,
              parentId: data.page.id,
              childIndex,
              point: pagePoint,
              style: { ...data.appState.currentStyle },
            }),
          },
        },
        pageState: {
          ...data.pageState,
          selectedIds: [id],
        },
      }
    })

    switch (this.appState.activeToolType) {
      case 'draw': {
        this.startDrawSession(id, pagePoint)
        break
      }
      case 'bounds': {
        this.startTransformSession(pagePoint, TLBoundsCorner.BottomRight)
        break
      }
      case 'point': {
        break
      }
      case 'points': {
        break
      }
    }
  }

  /* --------------------- Events --------------------- */
  onKeyDown = (key: string, info: TLKeyboardInfo) => {
    if (key === 'Escape') {
      this.cancel()
      return
    }

    switch (this.status.current) {
      case 'idle': {
        break
      }
      case 'brushing': {
        if (key === 'Meta' || key === 'Control') {
          this.updateBrushSession(this.getPagePoint(info.point), info.metaKey)
          return
        }

        break
      }
      case 'translating': {
        if (key === 'Escape') {
          this.cancelSession(this.getPagePoint(info.point))
        }

        if (key === 'Shift' || key === 'Alt') {
          this.updateTranslateSession(this.getPagePoint(info.point), info.shiftKey, info.altKey)
        }
        break
      }
      case 'transforming': {
        if (key === 'Escape') {
          this.cancelSession(this.getPagePoint(info.point))
        }

        if (key === 'Shift' || key === 'Alt') {
          this.updateTransformSession(this.getPagePoint(info.point), info.shiftKey, info.altKey)
        }
        break
      }
    }
  }

  onKeyUp = (key: string, info: TLKeyboardInfo) => {
    switch (this.status.current) {
      case 'brushing': {
        if (key === 'Meta' || key === 'Control') {
          this.updateBrushSession(this.getPagePoint(info.point), info.metaKey)
        }
        break
      }
      case 'transforming': {
        if (key === 'Shift' || key === 'Alt') {
          this.updateTransformSession(this.getPagePoint(info.point), info.shiftKey, info.altKey)
        }
        break
      }
      case 'translating': {
        if (key === 'Shift' || key === 'Alt') {
          this.updateTransformSession(this.getPagePoint(info.point), info.shiftKey, info.altKey)
        }
        break
      }
    }
  }

  /* ------------- Renderer Event Handlers ------------ */
  onPinchStart: TLPinchEventHandler = (info) => {
    this.setStatus('pinching')
  }

  onPinchEnd: TLPinchEventHandler = () => {
    this.setStatus(this.status.previous)
  }

  onPinch: TLPinchEventHandler = (info, e) => {
    if (this.status.current !== 'pinching') return

    this.pinchZoom(info.origin, info.delta, info.delta[2] / 350)
    this.updateSessionsOnPointerMove(info, e as any)
  }

  onPan: TLWheelEventHandler = (info, e) => {
    const delta = Vec.div(info.delta, this.getPageState().camera.zoom)
    const prev = this.getPageState().camera.point
    const next = Vec.sub(prev, delta)

    if (Vec.isEqual(next, prev)) return

    this.pan(delta)
    this.updateSessionsOnPointerMove(info, e as any)
  }

  onZoom: TLWheelEventHandler = (info, e) => {
    this.zoom(info.delta[2] / 100)
    this.updateSessionsOnPointerMove(info, e as any)
  }

  // Pointer Events
  onPointerDown: TLPointerEventHandler = (info) => {
    switch (this.status.current) {
      case 'idle': {
        switch (this.appState.activeTool) {
          case 'draw': {
            this.setStatus('creating')
            this.createActiveToolShape(info.point)
            break
          }
          case 'rectangle': {
            this.setStatus('creating')
            this.createActiveToolShape(info.point)
            break
          }
          case 'ellipse': {
            this.setStatus('creating')
            this.createActiveToolShape(info.point)
            break
          }
        }
      }
    }
  }

  onPointerMove: TLPointerEventHandler = (info, e) => {
    this.updateSessionsOnPointerMove(info, e)
  }

  onPointerUp: TLPointerEventHandler = (info) => {
    const data = this.getState()

    switch (this.status.current) {
      case 'pointingBoundsHandle': {
        this.setStatus('idle')
        this.pointedBoundsHandle = undefined
        break
      }
      case 'pointingBounds': {
        if (info.target === 'bounds') {
          // If we just clicked the selecting bounds's background, clear the selection
          this.deselectAll()
        } else if (data.pageState.selectedIds.includes(info.target)) {
          // If we're holding shift...
          if (info.shiftKey) {
            // Unless we just shift-selected the shape, remove it from the selected shapes
            if (this.pointedId !== info.target) {
              this.setSelectedIds(data.pageState.selectedIds.filter((id) => id !== info.target))
            }
          }
        }

        this.setStatus('idle')
        this.pointedId = undefined
        break
      }
      case 'brushing': {
        this.completeSession<BrushSession>()
        brushUpdater.clear()
        break
      }
      case 'translating': {
        this.completeSession(this.getPagePoint(info.point))
        this.pointedId = undefined
        break
      }
      case 'transforming': {
        this.completeSession(this.getPagePoint(info.point))
        this.pointedBoundsHandle = undefined
        break
      }
      case 'creating': {
        this.completeSession(this.getPagePoint(info.point))
      }
    }
  }

  // Canvas (background)
  onPointCanvas: TLCanvasEventHandler = (info) => {
    switch (this.status.current) {
      case 'idle': {
        switch (this.appState.activeTool) {
          case 'select': {
            // Unless the user is holding shift or meta, clear the current selection
            if (!(info.shiftKey || info.metaKey)) {
              this.deselectAll()
            }

            // Start a brush session
            this.startBrushSession(this.getPagePoint(info.point))
            break
          }
        }
      }
    }
  }

  onDoubleClickCanvas: TLCanvasEventHandler = () => {
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
    switch (this.status.current) {
      case 'idle': {
        switch (this.appState.activeTool) {
          case 'select': {
            if (info.metaKey) {
              // While holding command key, allow event to pass through to canvas
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

            this.setStatus('pointingBounds')
            break
          }
        }
      }
    }
  }

  onReleaseShape: TLPointerEventHandler = (info) => {
    // const data = this.getState()
    // switch (this.status.current) {
    //   case 'pointingBounds': {
    //     if (info.metaKey) {
    //       // While holding command key, allow event to pass through to canvas
    //       return
    //     }
    //     // If the shape is selected...
    //     if (
    //       data.pageState.selectedIds.includes(info.target) &&
    //       this.pointedId !== info.target &&
    //       info.shiftKey
    //     ) {
    //       // If the shape is not selected; then if the user is pressing shift,
    //       // add the shape to the current selection; otherwise, set the shape as
    //       // the only selected shape.
    //       this.setSelectedIds(data.pageState.selectedIds.filter((id) => id !== info.target))
    //     }
    //     this.setStatus('pointingBounds')
    //     break
    //   }
    // }
  }

  onDoubleClickShape: TLPointerEventHandler = (info) => {
    if (this.selectedIds.includes(info.target)) {
      this.setSelectedIds([info.target])
    }
  }

  onRightPointShape: TLPointerEventHandler = () => {
    // TODO
  }

  onDragShape: TLPointerEventHandler = (info) => {
    // Unused
  }

  onHoverShape: TLPointerEventHandler = (info) => {
    this.setState((data) => ({ appState: { ...data.appState, hoveredId: info.target } }))
  }

  onUnhoverShape: TLPointerEventHandler = (info) => {
    setTimeout(() => {
      if (this.getState().appState.hoveredId === info.target) {
        this.setState((data) => ({ appState: { ...data.appState, hoveredId: undefined } }))
      }
    }, 10)
  }

  // Bounds (bounding box background)
  onPointBounds: TLBoundsEventHandler = (info) => {
    this.setStatus('pointingBounds')
  }

  onDoubleClickBounds: TLBoundsEventHandler = () => {
    // TODO
  }

  onRightPointBounds: TLBoundsEventHandler = () => {
    // TODO
  }

  onDragBounds: TLBoundsEventHandler = (info) => {
    // Unused
  }

  onHoverBounds: TLBoundsEventHandler = () => {
    // TODO
  }

  onUnhoverBounds: TLBoundsEventHandler = () => {
    // TODO
  }

  onReleaseBounds: TLBoundsEventHandler = (info) => {
    switch (this.status.current) {
      case 'translating': {
        this.completeSession(this.getPagePoint(info.point))
        break
      }
      case 'brushing': {
        this.completeSession<BrushSession>()
        brushUpdater.clear()
        break
      }
    }
  }

  // Bounds handles (corners, edges)
  onPointBoundsHandle: TLBoundsHandleEventHandler = (info) => {
    this.pointedBoundsHandle = info.target
    this.setStatus('pointingBoundsHandle')
  }

  onDoubleClickBoundsHandle: TLBoundsHandleEventHandler = () => {
    // TODO
  }

  onRightPointBoundsHandle: TLBoundsHandleEventHandler = () => {
    // TODO
  }

  onDragBoundsHandle: TLBoundsHandleEventHandler = () => {
    // Unused
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

  onDoubleClickHandle: TLPointerEventHandler = () => {
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

  get data() {
    return this.getState()
  }

  get selectedIds() {
    return this.pageState.selectedIds
  }

  get page() {
    return this.pages[this.currentPageId]
  }

  get pageState() {
    return this.pageStates[this.currentPageId]
  }

  get appState() {
    return this.data.appState
  }
}
