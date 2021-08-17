/* eslint-disable @typescript-eslint/no-explicit-any */
import createReact from 'zustand'
import {
  TLBoundsCorner,
  TLBoundsEdge,
  TLBoundsEventHandler,
  TLBoundsHandleEventHandler,
  TLCallbacks,
  TLCanvasEventHandler,
  TLKeyboardInfo,
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
  Data,
  Session,
  Command,
  History,
  TLDrawStatus,
  ParametersExceptFirst,
  SelectHistory,
  DeepPartial,
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
  document: {
    id: 'doc',
    pages: {
      page: {
        id: 'page',
        childIndex: 1,
        shapes: {},
        bindings: {},
      },
    },
    pageStates: {
      page: {
        id: 'page',
        selectedIds: [],
        camera: {
          point: [0, 0],
          zoom: 1,
        },
      },
    },
  },
}

export class TLDrawState implements TLCallbacks {
  store = createReact<Data>(() => initialData)

  data: Data = initialData

  history: History = {
    stack: [],
    pointer: -1,
  }

  selectHistory: SelectHistory = {
    stack: [[]],
    pointer: 0,
  }

  clipboard?: TLDrawShape[]
  session?: Session

  pointedId?: string

  pointedHandle?: string

  pointedBoundsHandle?: TLBoundsCorner | TLBoundsEdge | 'rotate'

  isCreating = false

  _onChange?: (tlstate: TLDrawState, patch: DeepPartial<Data>, reason: string) => void

  // Low API
  private getState = this.store.getState

  private produce(patch: DeepPartial<Data>, reason: string) {
    const next = Utils.deepMerge<Data>(this.data, patch)
    this.setState(next)
    this._onChange?.(this, patch, reason)
    return this
  }

  private setStatus(status: TLDrawStatus) {
    this.data = {
      ...this.data,
      appState: {
        ...this.appState,
        status: {
          current: status,
          previous: this.appState.status.current,
        },
      },
    }

    this.store.setState(this.data)
  }

  private setState = (data: Data | ((data: Data) => Data), status?: TLDrawStatus) => {
    const prev = this.data

    this.data = typeof data === 'function' ? data(prev) : data

    // Remove deleted shapes and bindings (in Commands, these will be set to undefined)
    if (this.data.document !== prev.document) {
      Object.entries(this.data.document.pages).forEach(([pageId, page]) => {
        if (page === undefined) {
          // If set to undefined, delete the page and pagestate
          delete this.data.document.pages[pageId]
          delete this.data.document.pageStates[pageId]
          return
        }

        const prevPage = prev.document.pages[pageId]

        if (!prevPage || page.shapes !== prevPage.shapes || page.bindings !== prevPage.bindings) {
          page.shapes = { ...page.shapes }
          page.bindings = { ...page.bindings }

          Object.keys(page.shapes).forEach((id) => {
            if (!page.shapes[id]) delete page.shapes[id]
          })

          Object.keys(page.bindings).forEach((id) => {
            if (!page.bindings[id]) delete page.bindings[id]
          })

          const changedShapeIds = Object.values(page.shapes)
            .filter((shape) => prevPage.shapes[shape.id] !== shape)
            .map((shape) => shape.id)

          this.data.document.pages[pageId] = page

          // Get bindings related to the changed shapes
          const bindingsToUpdate = TLDR.getRelatedBindings(this.data, changedShapeIds, pageId)

          // Update all of the bindings we've just collected
          bindingsToUpdate.forEach((binding) => {
            const toShape = page.shapes[binding.toId]
            const fromShape = page.shapes[binding.fromId]
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

              page.shapes[fromShape.id] = nextShape
            }
          })
        }

        // Clean up page state, preventing hovers on deleted shapes

        const nextPageState: TLPageState = {
          ...this.data.document.pageStates[pageId],
        }

        if (nextPageState.hoveredId && !page.shapes[nextPageState.hoveredId]) {
          delete nextPageState.hoveredId
        }

        if (nextPageState.bindingId && !page.bindings[nextPageState.bindingId]) {
          console.warn('Could not find the binding shape!', pageId)
          delete nextPageState.bindingId
        }

        if (nextPageState.editingId && !page.bindings[nextPageState.editingId]) {
          console.warn('Could not find the editing shape!')
          delete nextPageState.editingId
        }

        this.data.document.pageStates[pageId] = nextPageState
      })
    }

    // Apply selected style change, if any

    const newSelectedStyle = TLDR.getSelectedStyle(this.data, this.currentPageId)

    if (newSelectedStyle) {
      this.data.appState = {
        ...this.data.appState,
        selectedStyle: newSelectedStyle,
      }
    }

    if (status) {
      this.data.appState = {
        ...this.data.appState,
        status: {
          current: status,
          previous: this.data.appState.status.current,
        },
      }
    }

    if (this.pageState.id !== this.currentPageId) {
      throw Error('Mismatch!')
    }

    this.store.setState(this.data)

    return this
  }

  getShape = <T extends TLDrawShape = TLDrawShape>(id: string, pageId = this.currentPageId): T => {
    return TLDR.getShape<T>(this.data, id, pageId)
  }

  getPage = (pageId = this.currentPageId) => {
    return TLDR.getPage(this.data, pageId || this.currentPageId)
  }

  getShapes = (pageId = this.currentPageId) => {
    return TLDR.getShapes(this.data, pageId || this.currentPageId)
  }

  getBindings = (pageId = this.currentPageId) => {
    return TLDR.getBindings(this.data, pageId || this.currentPageId)
  }

  getPageState = (pageId = this.currentPageId) => {
    return TLDR.getPageState(this.data, pageId || this.currentPageId)
  }

  getAppState = () => {
    return this.getState().appState
  }

  getPagePoint = (point: number[], pageId = this.currentPageId) => {
    const { camera } = this.getPageState(pageId)
    return Vec.sub(Vec.div(point, camera.zoom), camera.point)
  }

  /* ----------------------- UI ----------------------- */
  toggleStylePanel = () => {
    return this.produce(
      {
        appState: {
          isStyleOpen: !this.appState.isStyleOpen,
        },
      },
      'ui:toggled_style_panel'
    )
  }

  /* -------------------- Settings -------------------- */
  togglePenMode = () => {
    return this.produce(
      {
        settings: {
          isPenMode: !this.data.settings.isPenMode,
        },
      },
      `settings:toggled_pen_mode`
    )
  }

  toggleDarkMode = () => {
    return this.produce(
      {
        settings: {
          isDarkMode: !this.data.settings.isDarkMode,
        },
      },
      `settings:toggled_dark_mode`
    )
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
    const emptyData: Data = {
      appState: {
        ...initialData.appState,
      },
      settings: {
        ...initialData.settings,
      },
      document: {
        ...initialData.document,
        pages: {
          page: {
            ...initialData.document.pages.page,
            id: 'page',
            shapes: {},
            bindings: {},
          },
        },
        pageStates: {
          page: {
            id: 'page',
            selectedIds: [],
            camera: {
              point: [0, 0],
              zoom: 1,
            },
          },
        },
      },
    }

    this.setState(emptyData)
    this._onChange?.(this, this.data, `reset`)
    return this
  }

  selectTool = (tool: TLDrawShapeType | 'select') => {
    return this.produce(
      {
        appState: {
          activeTool: tool,
          activeToolType:
            tool === 'select'
              ? 'select'
              : TLDR.getShapeUtils({ type: tool } as TLDrawShape).toolType,
        },
      },
      `selected_tool:${tool}`
    )
  }

  toggleToolLock = () => {
    return this.produce(
      {
        appState: {
          isToolLocked: true,
        },
      },
      `toggled_tool_lock`
    )
  }

  /* --------------------- Camera --------------------- */
  zoomIn = () => {
    const i = Math.round((this.pageState.camera.zoom * 100) / 25)
    const nextZoom = TLDR.getCameraZoom((i + 1) * 0.25)
    this.zoomTo(nextZoom)
    return this
  }

  zoomOut = () => {
    const i = Math.round((this.pageState.camera.zoom * 100) / 25)
    const nextZoom = TLDR.getCameraZoom((i - 1) * 0.25)
    this.zoomTo(nextZoom)
    return this
  }

  zoomToFit = () => {
    const shapes = this.getShapes()
    if (shapes.length === 0) return

    const bounds = Utils.getCommonBounds(Object.values(shapes).map(TLDR.getBounds))

    const zoom = TLDR.getCameraZoom(
      bounds.width > bounds.height
        ? (window.innerWidth - 128) / bounds.width
        : (window.innerHeight - 128) / bounds.height
    )

    const mx = (window.innerWidth - bounds.width * zoom) / 2 / zoom
    const my = (window.innerHeight - bounds.height * zoom) / 2 / zoom

    return this.produce(
      {
        document: {
          pageStates: {
            [this.currentPageId]: {
              camera: {
                point: Vec.round(Vec.add([-bounds.minX, -bounds.minY], [mx, my])),
                zoom,
              },
            },
          },
        },
      },
      `zoomed_to_fit`
    )

    return this
  }

  zoomToSelection = () => {
    if (this.pageState.selectedIds.length === 0) return

    const bounds = TLDR.getSelectedBounds(this.data)

    const zoom = TLDR.getCameraZoom(
      bounds.width > bounds.height
        ? (window.innerWidth - 128) / bounds.width
        : (window.innerHeight - 128) / bounds.height
    )

    const mx = (window.innerWidth - bounds.width * zoom) / 2 / zoom
    const my = (window.innerHeight - bounds.height * zoom) / 2 / zoom

    return this.produce(
      {
        document: {
          pageStates: {
            [this.currentPageId]: {
              camera: {
                point: Vec.round(Vec.add([-bounds.minX, -bounds.minY], [mx, my])),
                zoom,
              },
            },
          },
        },
      },
      `zoomed_to_selection`
    )
  }

  resetCamera = () => {
    return this.produce(
      {
        document: {
          pageStates: {
            [this.currentPageId]: {
              camera: {
                point: Vec.round([window.innerWidth / 2, window.innerHeight / 2]),
                zoom: 1,
              },
            },
          },
        },
      },
      `reset_camera`
    )
  }

  zoomToContent = () => {
    const shapes = this.getShapes()
    const pageState = this.pageState
    if (shapes.length === 0) return

    const bounds = Utils.getCommonBounds(Object.values(shapes).map(TLDR.getBounds))

    const { zoom } = pageState.camera
    const mx = (window.innerWidth - bounds.width * zoom) / 2 / zoom
    const my = (window.innerHeight - bounds.height * zoom) / 2 / zoom

    return this.produce(
      {
        document: {
          pageStates: {
            [this.currentPageId]: {
              camera: {
                point: Vec.round(Vec.add([-bounds.minX, -bounds.minY], [mx, my])),
              },
            },
          },
        },
      },
      `zoomed_to_content`
    )
  }

  zoomToActual = () => {
    this.zoomTo(1)
    return this
  }

  zoomTo(next: number) {
    const { zoom, point } = this.pageState.camera
    const center = [window.innerWidth / 2, window.innerHeight / 2]
    const p0 = Vec.sub(Vec.div(center, zoom), point)
    const p1 = Vec.sub(Vec.div(center, next), point)

    return this.produce(
      {
        document: {
          pageStates: {
            [this.currentPageId]: {
              camera: {
                point: Vec.round(Vec.add(point, Vec.sub(p1, p0))),
                zoom: next,
              },
            },
          },
        },
      },
      `zoomed_camera`
    )
  }

  zoom = Utils.throttle((delta: number) => {
    const { zoom } = this.pageState.camera
    const nextZoom = TLDR.getCameraZoom(zoom - delta * zoom)
    this.zoomTo(nextZoom)
    return this
  }, 16)

  pan = (delta: number[]) => {
    const { camera } = this.pageState

    return this.produce(
      {
        document: {
          pageStates: {
            [this.currentPageId]: {
              camera: {
                point: Vec.round(Vec.sub(camera.point, delta)),
              },
            },
          },
        },
      },
      `panned`
    )
  }

  pinchZoom = (point: number[], delta: number[], zoomDelta: number) => {
    const { camera } = this.pageState
    const nextPoint = Vec.add(camera.point, Vec.div(delta, camera.zoom))
    const nextZoom = TLDR.getCameraZoom(camera.zoom - zoomDelta * camera.zoom)
    const p0 = Vec.sub(Vec.div(point, camera.zoom), nextPoint)
    const p1 = Vec.sub(Vec.div(point, nextZoom), nextPoint)

    return this.produce(
      {
        document: {
          pageStates: {
            [this.currentPageId]: {
              camera: {
                point: Vec.round(Vec.add(nextPoint, Vec.sub(p1, p0))),
                zoom: nextZoom,
              },
            },
          },
        },
      },
      `pinch_zoomed`
    )
  }

  /* -------------------------------------------------- */
  /*                      Document                      */
  /* -------------------------------------------------- */

  loadDocument = (document: TLDrawDocument, onChange?: TLDrawState['_onChange']) => {
    this._onChange = onChange

    this.history.pointer = -1
    this.history.stack = []

    this.selectHistory.pointer = 0
    this.selectHistory.stack = [[]]

    let i = 1

    this.data = {
      ...this.data,
      appState: {
        ...this.appState,
        currentPageId: Object.keys(document.pages)[0],
      },
      document: {
        ...document,
        pages: Object.fromEntries(
          Object.entries(document.pages).map(([id, page]) => {
            return [
              id,
              {
                ...page,
                name: page.name ? page.name : `Page ${i++}`,
              },
            ]
          })
        ),
        pageStates: Object.fromEntries(
          Object.entries(document.pageStates).map(([id, pageState]) => {
            return [
              id,
              {
                ...pageState,
                bindingId: undefined,
                editingId: undefined,
                hoveredId: undefined,
                pointedId: undefined,
              },
            ]
          })
        ),
      },
    }

    this.store.setState(this.data)

    return this
  }

  newProject = () => {
    // TODO
  }

  saveProject = () => {
    // TODO
  }

  loadProject = () => {
    // TODO
  }

  signOut = () => {
    // TODO
  }

  /* -------------------------------------------------- */
  /*                      Sessions                      */
  /* -------------------------------------------------- */

  startSession<T extends Session>(session: T, ...args: ParametersExceptFirst<T['start']>) {
    this.session = session
    const result = session.start(this.getState(), ...args)
    if (result) {
      this.produce(
        {
          ...result,
          appState: {
            ...result.appState,
            status: {
              current: session.status,
              previous: this.appState.status.previous,
            },
          },
        },
        `session:start_${session.id}`
      )
    } else {
      this.setStatus(session.status)
    }
    return this
  }

  updateSession<T extends Session>(...args: ParametersExceptFirst<T['update']>) {
    const { session } = this
    if (!session) return this
    this.produce(session.update(this.data, ...args), `session:update:${session.id}`)
    return this
  }

  cancelSession<T extends Session>(...args: ParametersExceptFirst<T['cancel']>) {
    const { session } = this
    if (!session) return this
    this.session = undefined

    if (this.isCreating) {
      this.produce(
        {
          appState: {
            status: {
              current: TLDrawStatus.Idle,
              previous: this.appState.status.previous,
            },
          },
          document: {
            pages: {
              [this.currentPageId]: {
                shapes: {
                  ...Object.fromEntries(this.selectedIds.map((id) => [id, undefined] as any)),
                },
              },
            },
            pageStates: {
              [this.currentPageId]: {
                selectedIds: [],
                editingId: undefined,
                bindingId: undefined,
                hoveredId: undefined,
              },
            },
          },
        },
        `session:cancel_create:${session.id}`
      )

      this.isCreating = false
    } else {
      this.produce(
        {
          ...session.cancel(this.data, ...args),
          appState: {
            status: {
              current: TLDrawStatus.Idle,
              previous: this.appState.status.current,
            },
          },
        },
        `session:cancel:${session.id}`
      )
    }

    return this
  }

  completeSession<T extends Session>(...args: ParametersExceptFirst<T['complete']>) {
    const { session } = this
    if (!session) return this

    const result = session.complete(this.data, ...args)

    this.session = undefined

    if (result === undefined) {
      this.produce(
        {
          appState: {
            status: {
              current: TLDrawStatus.Idle,
              previous: this.appState.status.previous,
            },
          },
        },
        `session:complete:${session.id}`
      )
      this.isCreating = false
    } else if ('after' in result) {
      // Session ended with a command

      if (this.isCreating) {
        // We're currently creating a shape. Override the command's
        // before state so that when we undo the command, we remove
        // the shape we just created.
        result.before = {
          document: {
            pages: {
              [this.currentPageId]: {
                shapes: Object.fromEntries(this.selectedIds.map((id) => [id, undefined])),
              },
            },
            pageStates: {
              [this.currentPageId]: {
                selectedIds: [],
                editingId: undefined,
                bindingId: undefined,
                hoveredId: undefined,
              },
            },
          },
        }
      }

      result.after = {
        ...result.after,
        appState: {
          ...result.after.appState,
          status: {
            current: TLDrawStatus.Idle,
            previous: this.appState.status.previous,
          },
        },
      }

      this.isCreating = false

      this.do(result)
    } else {
      this.produce(
        {
          ...result,
          appState: {
            ...result.appState,
            status: {
              current: TLDrawStatus.Idle,
              previous: this.appState.status.previous,
            },
          },
        },
        `session:complete:${session.id}`
      )
    }

    const { isToolLocked, activeTool } = this.appState

    if (!isToolLocked && activeTool !== 'draw') {
      this.selectTool('select')
    }

    return this
  }

  /* -------------------------------------------------- */
  /*                       History                      */
  /* -------------------------------------------------- */

  do(command: Command) {
    const { history } = this

    if (history.pointer !== history.stack.length - 1) {
      history.stack = history.stack.slice(0, history.pointer + 1)
    }

    history.stack.push(command)

    history.pointer = history.stack.length - 1

    this.produce(command.after, `command:${command.id}`)

    this.clearSelectHistory()

    return this
  }

  undo = () => {
    const { history } = this

    if (history.pointer <= -1) return this

    const command = history.stack[history.pointer]

    this.produce(command.before, `undo:${command.id}`)

    history.pointer--

    this.clearSelectHistory()

    return this
  }

  redo = () => {
    const { history } = this

    if (history.pointer >= history.stack.length - 1) return this

    history.pointer++

    const command = history.stack[history.pointer]

    this.produce(command.after, `redo:${command.id}`)

    this.addToSelectHistory(this.selectedIds)

    return this
  }

  /* -------------------------------------------------- */
  /*                      Selection                     */
  /* -------------------------------------------------- */

  setSelectedIds(ids: string[], push = false) {
    return this.produce(
      {
        appState: {
          activeTool: 'select',
          activeToolType: 'select',
        },
        document: {
          pageStates: {
            [this.currentPageId]: {
              selectedIds: push ? [...this.pageState.selectedIds, ...ids] : [...ids],
            },
          },
        },
      },
      `selected`
    )
  }

  private clearSelectHistory() {
    this.selectHistory.pointer = 0
    this.selectHistory.stack = [this.selectedIds]
  }

  private addToSelectHistory(ids: string[]) {
    if (this.selectHistory.pointer < this.selectHistory.stack.length) {
      this.selectHistory.stack = this.selectHistory.stack.slice(0, this.selectHistory.pointer + 1)
    }
    this.selectHistory.pointer++
    this.selectHistory.stack.push(ids)
  }

  undoSelect() {
    if (this.selectHistory.pointer > 0) {
      this.selectHistory.pointer--
      this.setSelectedIds(this.selectHistory.stack[this.selectHistory.pointer])
    }
  }

  redoSelect() {
    if (this.selectHistory.pointer < this.selectHistory.stack.length - 1) {
      this.selectHistory.pointer++
      this.setSelectedIds(this.selectHistory.stack[this.selectHistory.pointer])
    }
  }

  select = (...ids: string[]) => {
    this.setSelectedIds(ids)
    this.addToSelectHistory(ids)
    return this
  }

  selectAll = () => {
    this.setSelectedIds(Object.keys(this.page.shapes))
    this.addToSelectHistory(this.selectedIds)
    return this
  }

  deselectAll = () => {
    this.setSelectedIds([])
    this.addToSelectHistory(this.selectedIds)

    return this
  }

  /* ----------------- Shape Functions ---------------- */
  style = (style: Partial<ShapeStyles>, ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : this.selectedIds
    this.do(Commands.style(data, idsToMutate, style))
    return this
  }

  align = (type: AlignType, ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : this.selectedIds
    this.do(Commands.align(data, idsToMutate, type))
    return this
  }

  distribute = (type: DistributeType, ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : this.selectedIds
    this.do(Commands.distribute(data, idsToMutate, type))
    return this
  }

  stretch = (type: StretchType, ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : this.selectedIds
    this.do(Commands.stretch(data, idsToMutate, type))
    return this
  }

  flipHorizontal = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : this.selectedIds
    this.do(Commands.flip(data, idsToMutate, FlipType.Horizontal))
    return this
  }

  flipVertical = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : this.selectedIds
    this.do(Commands.flip(data, idsToMutate, FlipType.Vertical))
    return this
  }

  moveToBack = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : this.selectedIds
    this.do(Commands.move(data, idsToMutate, MoveType.ToBack))
    return this
  }

  moveBackward = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : this.selectedIds
    this.do(Commands.move(data, idsToMutate, MoveType.Backward))
    return this
  }

  moveForward = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : this.selectedIds
    this.do(Commands.move(data, idsToMutate, MoveType.Forward))
    return this
  }

  moveToFront = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : this.selectedIds
    this.do(Commands.move(data, idsToMutate, MoveType.ToFront))
    return this
  }

  nudge = (delta: number[], isMajor = false, ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : this.selectedIds
    this.do(Commands.translate(data, idsToMutate, Vec.mul(delta, isMajor ? 10 : 1)))
    return this
  }

  duplicate = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : this.selectedIds
    this.do(Commands.duplicate(data, idsToMutate))
    return this
  }

  toggleHidden = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : this.selectedIds
    this.do(Commands.toggle(data, idsToMutate, 'isHidden'))
    return this
  }

  toggleLocked = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : this.selectedIds
    this.do(Commands.toggle(data, idsToMutate, 'isLocked'))
    return this
  }

  toggleAspectRatioLocked = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : this.selectedIds
    this.do(Commands.toggle(data, idsToMutate, 'isAspectRatioLocked'))
    return this
  }

  toggleDecoration = (handleId: string, ids?: string[]) => {
    if (handleId === 'start' || handleId === 'end') {
      const data = this.store.getState()
      const idsToMutate = ids ? ids : this.selectedIds
      this.do(Commands.toggleDecoration(data, idsToMutate, handleId))
    }

    return this
  }

  toggleDebugMode = () => {
    // TODO
  }

  rotate = (delta = Math.PI * -0.5, ids?: string[]) => {
    const data = this.store.getState()
    const idsToMutate = ids ? ids : this.selectedIds
    this.do(Commands.rotate(data, idsToMutate, delta))
    return this
  }

  group = () => {
    // TODO
    // const data = this.store.getState()
    // const idsToMutate = ids ? ids : this.selectedIds
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
    const idsToMutate = ids ? ids : this.selectedIds

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

  createPage() {
    this.do(Commands.createPage(this.data))
    return this
  }

  changePage(pageId: string) {
    this.do(Commands.changePage(this.data, pageId))
    return this
  }

  renamePage(pageId: string, name: string) {
    this.do(Commands.renamePage(this.data, pageId, name))
    return this
  }

  duplicatePage(pageId: string) {
    this.do(Commands.duplicatePage(this.data, pageId))
    return this
  }

  deletePage(pageId?: string) {
    if (Object.values(this.document.pages).length <= 1) return
    this.do(Commands.deletePage(this.data, pageId ? pageId : this.currentPageId))
    return this
  }

  copy = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToCopy = ids ? ids : this.selectedIds

    this.clipboard = idsToCopy.map((id) => {
      const shape = this.getShape(id, this.currentPageId)

      return {
        ...shape,
        id: Utils.uniqueId(),
        childIndex: TLDR.getChildIndexAbove(data, id, this.currentPageId),
      }
    })

    return this
  }

  paste = (string?: string) => {
    const { data } = this

    if (string) {
      // Parse shapes from string
      try {
        const jsonShapes: TLDrawShape[] = JSON.parse(string)

        jsonShapes.forEach((shape) => {
          if (shape.parentId !== this.currentPageId) {
            shape.parentId = this.currentPageId
          }
        })

        this.create(...jsonShapes)
      } catch (e) {
        // Create text shape
        const childIndex =
          this.getShapes().sort((a, b) => b.childIndex - a.childIndex)[0].childIndex + 1

        const shape = TLDR.getShapeUtils<TextShape>(TLDrawShapeType.Text).create({
          id: Utils.uniqueId(),
          parentId: data.appState.currentPageId,
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
            parentId: data.appState.currentPageId,
            childIndex,
            point: [boundsCenter.minX, boundsCenter.minY],
          })
        )
      }

      return
    }

    if (!this.clipboard) return this

    const shapesToPaste = this.clipboard.map((shape) => ({
      ...shape,
      id: Utils.uniqueId(),
      parentId: this.currentPageId,
    }))

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

    if (this.appState.activeTool === 'select') return

    if (!this.appState.activeToolType) throw Error

    const utils = TLDR.getShapeUtils({ type: this.appState.activeTool } as TLDrawShape)

    const shapes = this.getShapes()

    const childIndex =
      shapes.length === 0 ? 1 : shapes.sort((a, b) => b.childIndex - a.childIndex)[0].childIndex + 1

    this.produce(
      {
        appState: {
          status: {
            current: TLDrawStatus.Creating,
            previous: this.appState.status.current,
          },
        },
        document: {
          pages: {
            [this.currentPageId]: {
              shapes: {
                [id]: utils.create({
                  id,
                  parentId: this.currentPageId,
                  childIndex,
                  point: pagePoint,
                  style: { ...this.appState.currentStyle },
                }),
              },
            },
          },
          pageStates: {
            [this.currentPageId]: {
              selectedIds: [id],
            },
          },
        },
      },
      `started_creating:${this.appState.activeTool}`
    )

    this.isCreating = true

    const { activeTool, activeToolType } = this.appState

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

    const delta = Vec.div(info.delta, this.pageState.camera.zoom)
    const prev = this.pageState.camera.point
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
    switch (this.status.current) {
      case TLDrawStatus.PointingBounds: {
        if (info.target === 'bounds') {
          // If we just clicked the selecting bounds's background, clear the selection
          this.deselectAll()
        } else if (this.selectedIds.includes(info.target)) {
          // If we're holding shift...
          if (info.shiftKey) {
            // Unless we just shift-selected the shape, remove it from the selected shapes
            if (this.pointedId !== info.target) {
              this.select(...this.selectedIds.filter((id) => id !== info.target))
            }
          } else {
            if (this.pointedId !== info.target && this.selectedIds.length > 1) {
              this.select(info.target)
            }
          }
        } else if (this.pointedId === info.target) {
          if (info.shiftKey) {
            this.select(...this.selectedIds, info.target)
          } else {
            this.select(info.target)
          }
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
    switch (this.status.current) {
      case TLDrawStatus.Idle: {
        switch (this.appState.activeTool) {
          case 'select': {
            if (info.metaKey) {
              // While holding command key, start a brush session
              this.startBrushSession(this.getPagePoint(info.point))
              return
            }

            if (!this.selectedIds.includes(info.target)) {
              this.pointedId = info.target
              // Set the pointed ID to the shape that was clicked.

              // If the shape is not selected; then if the user is pressing shift,
              // add the shape to the current selection; otherwise, set the shape as
              // the only selected shape.
              this.select(...(info.shiftKey ? [...this.selectedIds, info.target] : [info.target]))
            }

            this.setStatus(TLDrawStatus.PointingBounds)
            break
          }
        }
        break
      }
      case TLDrawStatus.PointingBounds: {
        this.pointedId = info.target
        break
      }
    }
  }

  onReleaseShape: TLPointerEventHandler = () => {
    // Unused
  }

  onDoubleClickShape: TLPointerEventHandler = () => {
    // TODO (drill into group)
  }

  onRightPointShape: TLPointerEventHandler = () => {
    // TODO
  }

  onDragShape: TLPointerEventHandler = () => {
    // Unused
  }

  onHoverShape: TLPointerEventHandler = (info) => {
    this.produce(
      {
        document: {
          pageStates: {
            [this.currentPageId]: {
              hoveredId: info.target,
            },
          },
        },
      },
      `hovered_shape:${info.target}`
    )
  }

  onUnhoverShape: TLPointerEventHandler = (info) => {
    const { currentPageId } = this
    setTimeout(() => {
      if (currentPageId === this.currentPageId && this.pageState.hoveredId === info.target) {
        this.produce(
          {
            document: {
              pageStates: {
                [this.currentPageId]: {
                  hoveredId: undefined,
                },
              },
            },
          },
          `unhovered_shape:${info.target}`
        )
      }
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
      this.produce(
        {
          appState: {
            isEmptyCanvas: false,
          },
        },
        'empty_canvas:false'
      )
    } else if (!appState.isEmptyCanvas && ids.length <= 0) {
      this.produce(
        {
          appState: {
            isEmptyCanvas: false,
          },
        },
        'empty_canvas:true'
      )
    }
  }

  onError = () => {
    // TODO
  }

  onBlurEditingShape = () => {
    this.completeSession()
  }

  get selectedIds() {
    return this.pageState.selectedIds
  }
  get page() {
    return this.data.document.pages[this.currentPageId]
  }

  get shapes() {
    return Object.values(this.page.shapes)
  }

  get bindings() {
    return Object.values(this.page.bindings)
  }

  get pageState() {
    return this.data.document.pageStates[this.currentPageId]
  }

  get appState() {
    return this.data.appState
  }

  get status() {
    return this.appState.status
  }

  get currentPageId() {
    return this.data.appState.currentPageId
  }

  get document() {
    return this.data.document
  }
}
