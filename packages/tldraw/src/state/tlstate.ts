/* eslint-disable @typescript-eslint/no-explicit-any */
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
  brushUpdater,
} from '@tldraw/core'
import {
  FlipType,
  TextShape,
  TLDrawDocument,
  MoveType,
  AlignType,
  StretchType,
  DistributeType,
  ShapeStyles,
  TLDrawShape,
  TLDrawShapeType,
  TLDrawToolType,
  TLDrawBinding,
  Data,
  Session,
  Command,
  History,
  TLDrawStatus,
  ParametersExceptFirst,
} from '~types'
import { TLDR } from './tldr'
import { defaultStyle } from '~shape'
import * as Sessions from './session'
import * as Commands from './command'

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
    pages: [{ id: 'page', name: 'page', childIndex: 1 }],
    currentStyle: defaultStyle,
    selectedStyle: defaultStyle,
    isToolLocked: false,
    isStyleOpen: false,
    isEmptyCanvas: false,
    status: {
      current: TLDrawStatus.Idle,
      previous: TLDrawStatus.Idle,
    },
  },
  page: {
    id: 'page',
    childIndex: 1,
    shapes: {},
    bindings: {},
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
  clipboard?: TLDrawShape[]
  session?: Session
  pointedId?: string
  pointedHandle?: string
  editingId?: string
  pointedBoundsHandle?: TLBoundsCorner | TLBoundsEdge | 'rotate'
  currentDocumentId = 'doc'
  currentPageId = 'page'
  pages: Record<string, TLPage<TLDrawShape, TLDrawBinding>> = { page: initialData.page }
  pageStates: Record<string, TLPageState> = { page: initialData.pageState }
  isCreating = false
  _onChange?: (state: TLDrawState, reason: string) => void

  // Low API
  private getState = this.store.getState

  private setStatus(status: TLDrawStatus) {
    this.store.setState((state) => ({
      appState: {
        ...state.appState,
        status: {
          current: status,
          previous: state.appState.status.current,
        },
      },
    }))
  }

  private setState = <T extends keyof Data>(
    data: Partial<Data> | ((data: Data) => Partial<Data>),
    status?: TLDrawStatus
  ) => {
    const current = this.getState()

    // Apply incoming change
    const result = typeof data === 'function' ? data(current) : data

    const next = { ...current, ...result }

    // Remove deleted shapes and bindings (in Commands, these will be set to undefined)
    if (result.page) {
      next.page = {
        ...next.page,
        shapes: { ...next.page.shapes },
        bindings: { ...next.page.bindings },
      }

      for (const id in next.page.shapes) {
        if (!next.page.shapes[id]) delete next.page.shapes[id]
      }

      for (const id in next.page.bindings) {
        if (!next.page.bindings[id]) delete next.page.bindings[id]
      }

      const changedShapeIds = Object.values(next.page.shapes)
        .filter((shape) => current.page.shapes[shape.id] !== shape)
        .map((shape) => shape.id)

      // Get bindings related to the changed shapes
      const bindingsToUpdate = TLDR.getRelatedBindings(next, changedShapeIds)

      // Update all of the bindings we've just collected
      bindingsToUpdate.forEach((binding) => {
        const toShape = next.page.shapes[binding.toId]
        const fromShape = next.page.shapes[binding.fromId]
        const toUtils = TLDR.getShapeUtils(toShape)

        // We only need to update the binding's "from" shape
        const util = TLDR.getShapeUtils(fromShape)

        const fromDelta = util.onBindingChange(
          fromShape,
          binding,
          toShape,
          toUtils.getBounds(toShape),
          toUtils.getCenter(toShape)
        )

        if (fromDelta) {
          const nextShape = {
            ...fromShape,
            ...fromDelta,
          } as TLDrawShape

          next.page.shapes[fromShape.id] = nextShape
        }
      })
    }

    // Clean up page state, preventing hovers on deleted shapes

    if (next.pageState.hoveredId && !next.page.shapes[next.pageState.hoveredId]) {
      delete next.pageState.hoveredId
    }

    if (next.pageState.bindingId && !next.page.bindings[next.pageState.bindingId]) {
      console.warn('Could not find the binding shape!')
      delete next.pageState.bindingId
    }

    if (next.pageState.editingId && !next.page.bindings[next.pageState.editingId]) {
      console.warn('Could not find the editing shape!')
      delete next.pageState.editingId
    }

    // Apply selected style change, if any
    const newSelectedStyle = TLDR.getSelectedStyle(next as Data)

    if (newSelectedStyle) {
      next.appState = {
        ...current.appState,
        ...next.appState,
        selectedStyle: newSelectedStyle,
      }
    }

    if (status) {
      next.appState = {
        ...next.appState,
        status: {
          current: status,
          previous: next.appState.status.current,
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

  getAppState = () => {
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
  // setStatus(status: TLDrawStatus) {
  //   this.status.previous = this.status.current
  //   this.status.current = status
  //   // console.log(this.status.previous, ' -> ', this.status.current)
  //   return this
  // }
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
      page: {
        ...data.page,
        shapes: {},
        bindings: {},
      },
      pageState: {
        ...data.pageState,
        editingId: undefined,
        bindingId: undefined,
        hoveredId: undefined,
        selectedIds: [],
      },
    }))
    this._onChange?.(this, `reset`)
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
          : (window.innerHeight - 128) / bounds.height
      )

      const mx = (window.innerWidth - bounds.width * zoom) / 2 / zoom
      const my = (window.innerHeight - bounds.height * zoom) / 2 / zoom

      return {
        pageState: {
          ...data.pageState,
          camera: {
            ...data.pageState.camera,
            point: Vec.round(Vec.add([-bounds.minX, -bounds.minY], [mx, my])),
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
          : (window.innerHeight - 128) / bounds.height
      )

      const mx = (window.innerWidth - bounds.width * zoom) / 2 / zoom
      const my = (window.innerHeight - bounds.height * zoom) / 2 / zoom

      return {
        pageState: {
          ...data.pageState,
          camera: {
            ...data.pageState.camera,
            point: Vec.round(Vec.add([-bounds.minX, -bounds.minY], [mx, my])),
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
          point: Vec.round([window.innerWidth / 2, window.innerHeight / 2]),
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
            point: Vec.round(Vec.add([-bounds.minX, -bounds.minY], [mx, my])),
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
            point: Vec.round(Vec.add(point, Vec.sub(p1, p0))),
            zoom: next,
          },
        },
      }
    })
    return this
  }

  zoom = Utils.throttle((delta: number) => {
    const { zoom } = this.store.getState().pageState.camera
    const nextZoom = TLDR.getCameraZoom(zoom - delta * zoom)
    this.zoomTo(nextZoom)
    return this
  }, 16)

  pan = (delta: number[]) => {
    this.setState((data) => {
      return {
        pageState: {
          ...data.pageState,
          camera: {
            ...data.pageState.camera,
            point: Vec.round(Vec.sub(data.pageState.camera.point, delta)),
          },
        },
      }
    })
    return this
  }

  pinchZoom = (point: number[], delta: number[], zoomDelta: number) => {
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
            point: Vec.round(Vec.add(nextPoint, Vec.sub(p1, p0))),
            zoom: nextZoom,
          },
        },
      }
    })
    return this
  }

  /* ---------------------- Document --------------------- */
  loadDocument = (document: TLDrawDocument, onChange?: TLDrawState['_onChange']) => {
    this._onChange = onChange
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
          .sort((a, b) => (a.childIndex || 0) - (b.childIndex || 0))
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
    this.setState((data) => session.start(data, ...args), session.status)
    this._onChange?.(this, `session:start_${session.id}`)
    return this
  }

  updateSession<T extends Session>(...args: ParametersExceptFirst<T['update']>) {
    const { session } = this
    if (!session) return this
    this.setState((data) => session.update(data, ...args))
    this._onChange?.(this, `session:update:${session.id}`)
    return this
  }

  cancelSession<T extends Session>(...args: ParametersExceptFirst<T['cancel']>) {
    const { session } = this
    if (!session) return this
    this.session = undefined

    if (this.isCreating) {
      this.setState((data) => ({
        page: {
          ...data.page,
          shapes: {
            ...data.page.shapes,
            ...Object.fromEntries(data.pageState.selectedIds.map((id) => [id, undefined] as any)),
          },
        },
        pageState: {
          ...data.pageState,
          selectedIds: [],
          editingId: undefined,
          bindingId: undefined,
          hoveredId: undefined,
        },
        appState: {
          ...data.appState,
          status: {
            current: TLDrawStatus.Idle,
            previous: data.appState.status.previous,
          },
        },
      }))

      this.isCreating = false
      this._onChange?.(this, `session:cancel_create:${session.id}`)
    } else {
      this.setState((data) => session.cancel(data, ...args), TLDrawStatus.Idle)
      this._onChange?.(this, `session:cancel:${session.id}`)
    }

    return this
  }

  completeSession<T extends Session>(...args: ParametersExceptFirst<T['complete']>) {
    const { session } = this
    if (!session) return this

    const current = this.getState()

    const result = session.complete(current, ...args)

    const { isToolLocked, activeTool } = this.appState

    if (!isToolLocked && activeTool !== 'draw') {
      this.selectTool('select')
    }

    this.session = undefined

    if ('after' in result) {
      // Session ended with a command

      if (this.isCreating) {
        // We're currently creating a shape. Override the command's
        // before state so that when we undo the command, we remove
        // the shape we just created.
        result.before = {
          page: {
            shapes: Object.fromEntries(current.pageState.selectedIds.map((id) => [id, undefined])),
          },
          pageState: {
            selectedIds: [],
            editingId: undefined,
            bindingId: undefined,
            hoveredId: undefined,
          },
        }
      }

      this.isCreating = false

      this.do(result)
    } else {
      this.setState((data) => Utils.deepMerge<Data>(data, result), TLDrawStatus.Idle)
      this._onChange?.(this, `session:complete:${session.id}`)
    }

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

    this.setState(
      (data) =>
        Object.fromEntries(
          Object.entries(command.after).map(([key, partial]) => {
            return [key, Utils.deepMerge(data[key as keyof Data], partial)]
          })
        ),
      TLDrawStatus.Idle
    )

    this._onChange?.(this, `command:${command.id}`)

    return this
  }

  undo = () => {
    const { history } = this

    if (history.pointer <= -1) return this

    const command = history.stack[history.pointer]

    this.setState(
      (data) =>
        Object.fromEntries(
          Object.entries(command.before).map(([key, partial]) => {
            return [key, Utils.deepMerge(data[key as keyof Data], partial)]
          })
        ),
      TLDrawStatus.Idle
    )

    history.pointer--

    this._onChange?.(this, `undo:${command.id}`)

    return this
  }

  redo = () => {
    const { history } = this

    if (history.pointer >= history.stack.length - 1) return this

    history.pointer++

    const command = history.stack[history.pointer]

    this.setState(
      (data) =>
        Object.fromEntries(
          Object.entries(command.after).map(([key, partial]) => {
            return [key, Utils.deepMerge(data[key as keyof Data], partial)]
          })
        ),
      TLDrawStatus.Idle
    )

    this._onChange?.(this, `redo:${command.id}`)

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
    this.setState((data) => ({
      appState: {
        ...data.appState,
        activeTool: 'select',
        activeToolType: 'select',
      },
      pageState: {
        ...data.pageState,
        selectedIds: Object.keys(data.page.shapes),
      },
    }))
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
    this.do(Commands.style(data, idsToMutate, style))
    return this
  }

  align = (type: AlignType, ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(Commands.align(data, idsToMutate, type))
    return this
  }

  distribute = (type: DistributeType, ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(Commands.distribute(data, idsToMutate, type))
    return this
  }

  stretch = (type: StretchType, ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(Commands.stretch(data, idsToMutate, type))
    return this
  }

  flipHorizontal = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(Commands.flip(data, idsToMutate, FlipType.Horizontal))
    return this
  }

  flipVertical = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(Commands.flip(data, idsToMutate, FlipType.Vertical))
    return this
  }

  moveToBack = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(Commands.move(data, idsToMutate, MoveType.ToBack))
    return this
  }

  moveBackward = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(Commands.move(data, idsToMutate, MoveType.Backward))
    return this
  }

  moveForward = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(Commands.move(data, idsToMutate, MoveType.Forward))
    return this
  }

  moveToFront = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(Commands.move(data, idsToMutate, MoveType.ToFront))
    return this
  }

  nudge = (delta: number[], isMajor = false, ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(Commands.translate(data, idsToMutate, Vec.mul(delta, isMajor ? 10 : 1)))
    return this
  }

  duplicate = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(Commands.duplicate(data, idsToMutate))
    return this
  }

  toggleHidden = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(Commands.toggle(data, idsToMutate, 'isHidden'))
    return this
  }

  toggleLocked = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(Commands.toggle(data, idsToMutate, 'isLocked'))
    return this
  }

  toggleAspectRatioLocked = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(Commands.toggle(data, idsToMutate, 'isAspectRatioLocked'))
    return this
  }

  toggleDecoration = (handleId: string, ids?: string[]) => {
    if (handleId === 'start' || handleId === 'end') {
      const data = this.store.getState()
      const idsToMutate = ids ? ids : data.pageState.selectedIds
      this.do(Commands.toggleDecoration(data, idsToMutate, handleId))
    }

    return this
  }

  rotate = (delta = Math.PI * -0.5, ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds
    this.do(Commands.rotate(data, idsToMutate, delta))
    return this
  }

  group = () => {
    // TODO
    // const data = this.store.getState()
    // const idsToMutate = ids ? ids : data.pageState.selectedIds
    // this.do(Commands.toggle(data, idsToMutate, 'isAspectRatioLocked'))
    return this
  }

  create = (...shapes: TLDrawShape[]) => {
    const data = this.store.getState()
    this.do(Commands.create(data, shapes))
    return this
  }

  delete = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : data.pageState.selectedIds

    if (idsToMutate.length === 0) return this

    this.do(Commands.deleteShapes(data, idsToMutate))
    return this
  }

  clear = () => {
    this.selectAll()
    this.delete()
    return this
  }

  cancel = () => {
    switch (this.status.current) {
      case TLDrawStatus.Idle: {
        this.deselectAll()
        this.selectTool('select')
        break
      }
      case TLDrawStatus.Brushing: {
        this.cancelSession()
        brushUpdater.clear()
        break
      }
      case TLDrawStatus.Translating: {
        this.cancelSession()
        break
      }
      case TLDrawStatus.Transforming: {
        this.cancelSession()
        break
      }
      case TLDrawStatus.Rotating: {
        this.cancelSession()
        break
      }
      case TLDrawStatus.Creating: {
        this.cancelSession()
        break
      }
    }

    return this
  }

  copy = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToCopy = ids ? ids : data.pageState.selectedIds

    this.clipboard = idsToCopy.map((id) => {
      const shape = data.page.shapes[id]

      return {
        ...shape,
        id: Utils.uniqueId(),
        childIndex: TLDR.getChildIndexAbove(data, id),
      }
    })

    return this
  }

  paste = (string?: string) => {
    const { data } = this
    if (string) {
      try {
        const jsonShapes = JSON.parse(string)
        this.create(...jsonShapes)
      } catch (e) {
        // Create a text shape from the given string
        const childIndex =
          Object.values(data.page.shapes).sort((a, b) => b.childIndex - a.childIndex)[0]
            .childIndex + 1

        const shape = TLDR.getShapeUtils<TextShape>(TLDrawShapeType.Text).create({
          id: Utils.uniqueId(),
          parentId: data.page.id,
          childIndex,
          point: this.getPagePoint([window.innerWidth / 2, window.innerHeight / 2]),
          style: { ...data.appState.currentStyle },
        })

        const boundsCenter = Utils.centerBounds(
          TLDR.getShapeUtils(shape).getBounds(shape),
          this.getPagePoint([window.innerWidth / 2, window.innerHeight / 2])
        )

        this.create(
          TLDR.getShapeUtils(TLDrawShapeType.Text).create({
            id: Utils.uniqueId(),
            parentId: data.page.id,
            childIndex,
            point: [boundsCenter.minX, boundsCenter.minY],
          })
        )
      }
    }

    if (!this.clipboard) return this

    const shapesToPaste = this.clipboard.map((shape) => {
      return {
        ...shape,
        id: Utils.uniqueId(),
      }
    })

    const commonBounds = Utils.getCommonBounds(shapesToPaste.map(TLDR.getBounds))

    const centeredBounds = Utils.centerBounds(
      commonBounds,
      this.getPagePoint([window.innerWidth / 2, window.innerHeight / 2])
    )

    let delta = Vec.sub(Utils.getBoundsCenter(centeredBounds), Utils.getBoundsCenter(commonBounds))

    if (Vec.isEqual(delta, [0, 0])) {
      delta = [16, 16]
    }

    this.create(
      ...shapesToPaste.map((shape) => ({
        ...shape,
        point: Vec.round(Vec.add(shape.point, delta)),
      }))
    )

    return this
  }

  copyAsSvg = () => {
    // TODO
    return '<svg/>'
  }

  copyAsJson = () => {
    // TODO
    return {}
  }

  save = () => {
    // TODO
    return this
  }
  /* -------------------- Sessions -------------------- */
  startBrushSession = (point: number[]) => {
    this.startSession(new Sessions.BrushSession(this.store.getState(), point))
    return this
  }

  updateBrushSession = (point: number[], metaKey = false) => {
    this.updateSession<Sessions.BrushSession>(point, metaKey)
    return this
  }

  startTranslateSession = (point: number[]) => {
    this.startSession(new Sessions.TranslateSession(this.store.getState(), point))
    return this
  }

  updateTranslateSession = (point: number[], shiftKey = false, altKey = false) => {
    this.updateSession<Sessions.TranslateSession>(point, shiftKey, altKey)
    return this
  }

  startTransformSession = (
    point: number[],
    handle: TLBoundsCorner | TLBoundsEdge | 'rotate',
    commandId?: string
  ) => {
    const { selectedIds } = this

    if (selectedIds.length === 0) return this

    this.pointedBoundsHandle = handle

    if (this.pointedBoundsHandle === 'rotate') {
      this.startSession(new Sessions.RotateSession(this.store.getState(), point))
    } else if (this.selectedIds.length === 1) {
      this.startSession(
        new Sessions.TransformSingleSession(
          this.store.getState(),
          point,
          this.pointedBoundsHandle,
          commandId
        )
      )
    } else {
      this.startSession(
        new Sessions.TransformSession(this.store.getState(), point, this.pointedBoundsHandle)
      )
    }
    return this
  }

  updateTransformSession = (point: number[], shiftKey = false, altKey = false) => {
    this.updateSession<Sessions.TransformSingleSession | Sessions.TransformSession>(
      point,
      shiftKey,
      altKey
    )
    return this
  }

  startTextSession = (id?: string) => {
    this.editingId = id
    this.startSession(new Sessions.TextSession(this.store.getState(), id))
    return this
  }

  updateTextSession = (text: string) => {
    this.updateSession<Sessions.TextSession>(text)
    return this
  }

  startDrawSession = (id: string, point: number[]) => {
    this.startSession(new Sessions.DrawSession(this.store.getState(), id, point))
    return this
  }

  updateDrawSession = (point: number[], pressure: number, shiftKey = false) => {
    this.updateSession<Sessions.DrawSession>(point, pressure, shiftKey)
    return this
  }

  startHandleSession = (point: number[], handleId: string, commandId?: string) => {
    const selectedShape = this.page.shapes[this.selectedIds[0]]
    if (selectedShape.type === TLDrawShapeType.Arrow) {
      this.startSession<Sessions.ArrowSession>(
        new Sessions.ArrowSession(this.store.getState(), handleId as 'start' | 'end', point)
      )
    } else {
      this.startSession<Sessions.HandleSession>(
        new Sessions.HandleSession(this.store.getState(), handleId, point, commandId)
      )
    }
    return this
  }

  updateHandleSession = (point: number[], shiftKey = false, altKey = false, metaKey = false) => {
    this.updateSession<Sessions.HandleSession | Sessions.ArrowSession>(
      point,
      shiftKey,
      altKey,
      metaKey
    )
    return this
  }

  updateOnPointerMove: TLPointerEventHandler = (info) => {
    switch (this.status.current) {
      case TLDrawStatus.PointingBoundsHandle: {
        if (!this.pointedBoundsHandle) throw Error('No pointed bounds handle')
        if (Vec.dist(info.origin, info.point) > 4) {
          this.startTransformSession(this.getPagePoint(info.origin), this.pointedBoundsHandle)
        }
        break
      }
      case TLDrawStatus.PointingHandle: {
        if (!this.pointedHandle) throw Error('No pointed handle')
        if (Vec.dist(info.origin, info.point) > 4) {
          this.startHandleSession(this.getPagePoint(info.origin), this.pointedHandle)
        }
        break
      }
      case TLDrawStatus.PointingBounds: {
        if (Vec.dist(info.origin, info.point) > 4) {
          this.startTranslateSession(this.getPagePoint(info.origin))
        }
        break
      }
      case TLDrawStatus.Brushing: {
        this.updateBrushSession(this.getPagePoint(info.point), info.metaKey)
        break
      }
      case TLDrawStatus.Translating: {
        this.updateTranslateSession(this.getPagePoint(info.point), info.shiftKey, info.altKey)
        break
      }
      case TLDrawStatus.Transforming: {
        this.updateTransformSession(this.getPagePoint(info.point), info.shiftKey, info.altKey)
        break
      }
      case TLDrawStatus.TranslatingHandle: {
        this.updateHandleSession(
          this.getPagePoint(info.point),
          info.shiftKey,
          info.altKey,
          info.metaKey
        )
        break
      }
      case TLDrawStatus.Creating: {
        switch (this.appState.activeToolType) {
          case 'draw': {
            this.updateDrawSession(this.getPagePoint(info.point), info.pressure, info.shiftKey)
            break
          }
          case 'bounds': {
            this.updateTransformSession(this.getPagePoint(info.point), info.shiftKey)
            break
          }
          case 'handle': {
            this.updateHandleSession(
              this.getPagePoint(info.point),
              info.shiftKey,
              info.altKey,
              info.metaKey
            )
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
    }, TLDrawStatus.Creating)

    this.isCreating = true

    const { activeTool, activeToolType } = this.getAppState()

    switch (activeToolType) {
      case TLDrawToolType.Draw: {
        this.startDrawSession(id, pagePoint)
        break
      }
      case TLDrawToolType.Bounds: {
        this.startTransformSession(pagePoint, TLBoundsCorner.BottomRight, `create_${activeTool}`)
        break
      }
      case TLDrawToolType.Handle: {
        this.startHandleSession(pagePoint, 'end', `create_${activeTool}`)
        break
      }
      case TLDrawToolType.Text: {
        this.startTextSession()
        break
      }
      case TLDrawToolType.Point: {
        break
      }
      case TLDrawToolType.Points: {
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
      case TLDrawStatus.Idle: {
        break
      }
      case TLDrawStatus.Brushing: {
        if (key === 'Meta' || key === 'Control') {
          this.updateBrushSession(this.getPagePoint(info.point), info.metaKey)
          return
        }

        break
      }
      case TLDrawStatus.Translating: {
        if (key === 'Escape') {
          this.cancelSession(this.getPagePoint(info.point))
        }

        if (key === 'Shift' || key === 'Alt') {
          this.updateTranslateSession(this.getPagePoint(info.point), info.shiftKey, info.altKey)
        }
        break
      }
      case TLDrawStatus.Transforming: {
        if (key === 'Escape') {
          this.cancelSession(this.getPagePoint(info.point))
        }

        if (key === 'Shift' || key === 'Alt') {
          this.updateTransformSession(this.getPagePoint(info.point), info.shiftKey, info.altKey)
        }
        break
      }
      case TLDrawStatus.TranslatingHandle: {
        if (key === 'Escape') {
          this.cancelSession(this.getPagePoint(info.point))
        }

        if (key === 'Meta' || key === 'Control') {
          this.updateHandleSession(
            this.getPagePoint(info.point),
            info.shiftKey,
            info.altKey,
            info.metaKey
          )
        }
        break
      }
    }
  }

  onKeyUp = (key: string, info: TLKeyboardInfo) => {
    switch (this.status.current) {
      case TLDrawStatus.Brushing: {
        if (key === 'Meta' || key === 'Control') {
          this.updateBrushSession(this.getPagePoint(info.point), info.metaKey)
        }
        break
      }
      case TLDrawStatus.Transforming: {
        if (key === 'Shift' || key === 'Alt') {
          this.updateTransformSession(this.getPagePoint(info.point), info.shiftKey, info.altKey)
        }
        break
      }
      case TLDrawStatus.Translating: {
        if (key === 'Shift' || key === 'Alt') {
          this.updateTransformSession(this.getPagePoint(info.point), info.shiftKey, info.altKey)
        }
        break
      }
      case TLDrawStatus.TranslatingHandle: {
        if (key === 'Escape') {
          this.cancelSession(this.getPagePoint(info.point))
        }

        if (key === 'Meta' || key === 'Control') {
          this.updateHandleSession(
            this.getPagePoint(info.point),
            info.shiftKey,
            info.altKey,
            info.metaKey
          )
        }
        break
      }
    }
  }

  /* ------------- Renderer Event Handlers ------------ */
  onPinchStart: TLPinchEventHandler = () => {
    this.setStatus(TLDrawStatus.Pinching)
  }

  onPinchEnd: TLPinchEventHandler = () => {
    this.setStatus(this.status.previous)
  }

  onPinch: TLPinchEventHandler = (info, e) => {
    if (this.status.current !== TLDrawStatus.Pinching) return

    this.pinchZoom(info.origin, info.delta, info.delta[2] / 350)
    this.updateOnPointerMove(info, e as any)
  }

  onPan: TLWheelEventHandler = (info, e) => {
    if (this.status.current === TLDrawStatus.Pinching) return
    // TODO: Pan and pinchzoom are firing at the same time. Considering turning one of them off!

    const delta = Vec.div(info.delta, this.getPageState().camera.zoom)
    const prev = this.getPageState().camera.point
    const next = Vec.sub(prev, delta)

    if (Vec.isEqual(next, prev)) return

    this.pan(delta)
    this.updateOnPointerMove(info, e as any)
  }

  onZoom: TLWheelEventHandler = (info, e) => {
    this.zoom(info.delta[2] / 100)
    this.updateOnPointerMove(info, e as any)
  }

  // Pointer Events
  onPointerDown: TLPointerEventHandler = (info) => {
    switch (this.status.current) {
      case TLDrawStatus.Idle: {
        switch (this.appState.activeTool) {
          case 'draw': {
            this.createActiveToolShape(info.point)
            break
          }
          case 'rectangle': {
            this.createActiveToolShape(info.point)
            break
          }
          case 'ellipse': {
            this.createActiveToolShape(info.point)
            break
          }
          case 'arrow': {
            this.createActiveToolShape(info.point)
            break
          }
        }
      }
    }
  }

  onPointerMove: TLPointerEventHandler = (info, e) => {
    this.updateOnPointerMove(info, e)
  }

  onPointerUp: TLPointerEventHandler = (info) => {
    const data = this.getState()

    switch (this.status.current) {
      case TLDrawStatus.PointingBounds: {
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
        } else if (this.pointedId === info.target) {
          if (info.shiftKey) {
            this.setSelectedIds([...data.pageState.selectedIds, info.target])
          } else {
            this.setSelectedIds([info.target])
          }
          this.pointedId = undefined
        }

        this.setStatus(TLDrawStatus.Idle)
        this.pointedId = undefined
        break
      }
      case TLDrawStatus.PointingBoundsHandle: {
        this.setStatus(TLDrawStatus.Idle)
        this.pointedBoundsHandle = undefined
        break
      }
      case TLDrawStatus.PointingHandle: {
        this.setStatus(TLDrawStatus.Idle)
        this.pointedHandle = undefined
        break
      }
      case TLDrawStatus.TranslatingHandle: {
        this.completeSession<Sessions.HandleSession>()
        this.pointedHandle = undefined
        break
      }
      case TLDrawStatus.Brushing: {
        this.completeSession<Sessions.BrushSession>()
        brushUpdater.clear()
        break
      }
      case TLDrawStatus.Translating: {
        this.completeSession<Sessions.TranslateSession>()
        this.pointedId = undefined
        break
      }
      case TLDrawStatus.Transforming: {
        this.completeSession<Sessions.TransformSession>()
        this.pointedBoundsHandle = undefined
        break
      }
      case TLDrawStatus.Creating: {
        this.completeSession(this.getPagePoint(info.point))
        this.pointedHandle = undefined
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
        break
      }
      case 'editing-text': {
        this.completeSession()
        break
      }
    }
  }

  onDoubleClickCanvas: TLCanvasEventHandler = (info) => {
    // Unused
    switch (this.status.current) {
      case 'idle': {
        switch (this.appState.activeTool) {
          case 'text': {
            // Create a text shape
            this.createActiveToolShape(info.point)
            break
          }
        }
        break
      }
    }
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
              // While holding command key, start a brush session
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

            this.setStatus(TLDrawStatus.PointingBounds)
            break
          }
        }
        break
      }
      case 'pointingBounds': {
        this.pointedId = info.target
        break
      }
    }
  }

  onReleaseShape: TLPointerEventHandler = () => {
    // Unused
  }

  onDoubleClickShape: TLPointerEventHandler = (info) => {
    if (this.selectedIds.includes(info.target)) {
      this.setSelectedIds([info.target])
    }
  }

  onRightPointShape: TLPointerEventHandler = () => {
    // TODO
  }

  onDragShape: TLPointerEventHandler = () => {
    // Unused
  }

  onHoverShape: TLPointerEventHandler = (info) => {
    this.setState((data) => ({
      pageState: { ...data.pageState, hoveredId: info.target },
    }))
  }

  onUnhoverShape: TLPointerEventHandler = (info) => {
    setTimeout(() => {
      this.setState((data) =>
        data.pageState.hoveredId === info.target
          ? {
              pageState: { ...data.pageState, hoveredId: undefined },
            }
          : data
      )
    }, 10)
  }

  // Bounds (bounding box background)
  onPointBounds: TLBoundsEventHandler = () => {
    this.setStatus(TLDrawStatus.PointingBounds)
  }

  onDoubleClickBounds: TLBoundsEventHandler = () => {
    // TODO
  }

  onRightPointBounds: TLBoundsEventHandler = () => {
    // TODO
  }

  onDragBounds: TLBoundsEventHandler = () => {
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
      case TLDrawStatus.Translating: {
        this.completeSession(this.getPagePoint(info.point))
        break
      }
      case TLDrawStatus.Brushing: {
        this.completeSession<Sessions.BrushSession>()
        brushUpdater.clear()
        break
      }
    }
  }

  // Bounds handles (corners, edges)
  onPointBoundsHandle: TLBoundsHandleEventHandler = (info) => {
    this.pointedBoundsHandle = info.target
    this.setStatus(TLDrawStatus.PointingBoundsHandle)
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
  onPointHandle: TLPointerEventHandler = (info) => {
    this.pointedHandle = info.target
    this.setStatus(TLDrawStatus.PointingHandle)
  }

  onDoubleClickHandle: TLPointerEventHandler = (info) => {
    this.toggleDecoration(info.target)
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
    // Unused
  }

  onTextChange = (id: string, text: string) => {
    this.updateTextSession(text)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onTextBlur = (id: string) => {
    this.completeSession()
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onTextFocus = (id: string) => {
    // Unused
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onTextKeyDown = (id: string, key: string) => {
    // Unused
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onTextKeyUp = (id: string, key: string) => {
    // Unused
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

  onError = () => {
    // TODO
  }

  onBlurEditingShape = () => {
    this.completeSession()
  }

  get document(): TLDrawDocument {
    return {
      id: this.currentDocumentId,
      pages: this.pages,
      pageStates: this.pageStates,
    }
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

  get shapes() {
    return Object.values(this.pages[this.currentPageId].shapes).sort(
      (a, b) => a.childIndex - b.childIndex
    )
  }

  get bindings() {
    return Object.values(this.pages[this.currentPageId].bindings)
  }

  get pageState() {
    return this.pageStates[this.currentPageId]
  }

  get appState() {
    return this.data.appState
  }

  get status() {
    return this.appState.status
  }
}
