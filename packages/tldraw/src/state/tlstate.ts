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
  TLDrawPage,
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
  SelectHistory,
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
  editingId?: string
  pointedBoundsHandle?: TLBoundsCorner | TLBoundsEdge | 'rotate'
  currentDocumentId = 'doc'
  currentPageId = 'page'
  document: TLDrawDocument
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
    if (result.document) {
      for (const pageId in result.document.pages) {
        const currentPage = next.document.pages[pageId]
        const nextPage = {
          ...next.document,
          shapes: { ...currentPage.shapes },
          bindings: { ...currentPage.bindings },
        }

        for (const id in nextPage.shapes) {
          if (!nextPage.shapes[id]) delete nextPage.shapes[id]
        }

        for (const id in nextPage.bindings) {
          if (!nextPage.bindings[id]) delete nextPage.bindings[id]
        }

        const changedShapeIds = Object.values(nextPage.shapes)
          .filter((shape) => currentPage.shapes[shape.id] !== shape)
          .map((shape) => shape.id)

        // Get bindings related to the changed shapes
        const bindingsToUpdate = TLDR.getRelatedBindings(next, changedShapeIds)

        // Update all of the bindings we've just collected
        bindingsToUpdate.forEach((binding) => {
          const toShape = nextPage.shapes[binding.toId]
          const fromShape = nextPage.shapes[binding.fromId]
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

            nextPage.shapes[fromShape.id] = nextShape
          }
        })

        // Clean up page state, preventing hovers on deleted shapes

        const nextPageState: TLPageState = {
          ...next.document.pageStates[next.appState.currentPageId],
        }

        if (nextPageState.hoveredId && !nextPage.shapes[nextPageState.hoveredId]) {
          delete nextPageState.hoveredId
        }

        if (nextPageState.bindingId && !nextPage.bindings[nextPageState.bindingId]) {
          console.warn('Could not find the binding shape!')
          delete nextPageState.bindingId
        }

        if (nextPageState.editingId && !nextPage.bindings[nextPageState.editingId]) {
          console.warn('Could not find the editing shape!')
          delete nextPageState.editingId
        }

        next.document.pages[pageId] = nextPage
        next.document.pageStates[pageId] = nextPageState
      }
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
    this.document = next.document

    return this
  }

  getShape = <T extends TLDrawShape = TLDrawShape>(id: string, pageId = this.currentPageId): T => {
    return this.document.pages[pageId].shapes[id] as T
  }

  getPage = (id = this.currentPageId) => {
    return this.document.pages[id]
  }

  getShapes = (id = this.currentPageId) => {
    return Object.values(this.getPage(id).shapes).sort((a, b) => a.childIndex - b.childIndex)
  }

  getPageState = (id = this.currentPageId) => {
    return this.document.pageStates[id]
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
            shapes: {},
            bindings: {},
          },
        },
      },
    }

    this.setState(emptyData)
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

    this.setState((data) => {
      return {
        document: {
          ...data.document,
          pageStates: {
            [this.currentPageId]: {
              ...data.document.pageStates[this.currentPageId],
              camera: {
                point: Vec.round(Vec.add([-bounds.minX, -bounds.minY], [mx, my])),
                zoom,
              },
            },
          },
        },
      }
    })

    return this
  }

  zoomToSelection = () => {
    if (this.getPageState().selectedIds.length === 0) return

    this.setState((data) => {
      const bounds = TLDR.getSelectedBounds(data)

      const zoom = TLDR.getCameraZoom(
        bounds.width > bounds.height
          ? (window.innerWidth - 128) / bounds.width
          : (window.innerHeight - 128) / bounds.height
      )

      const mx = (window.innerWidth - bounds.width * zoom) / 2 / zoom
      const my = (window.innerHeight - bounds.height * zoom) / 2 / zoom

      return {
        document: {
          ...data.document,
          pageStates: {
            [this.currentPageId]: {
              ...data.document.pageStates[this.currentPageId],
              camera: {
                point: Vec.round(Vec.add([-bounds.minX, -bounds.minY], [mx, my])),
                zoom,
              },
            },
          },
        },
      }
    })

    return this
  }

  resetCamera = () => {
    this.setState((data) => {
      return {
        document: {
          ...data.document,
          pageStates: {
            [this.currentPageId]: {
              ...data.document.pageStates[this.currentPageId],
              camera: {
                point: Vec.round([window.innerWidth / 2, window.innerHeight / 2]),
                zoom: 1,
              },
            },
          },
        },
      }
    })

    return this
  }

  zoomToContent = () => {
    const shapes = this.getShapes()
    const pageState = this.getPageState()
    if (shapes.length === 0) return

    this.setState((data) => {
      const bounds = Utils.getCommonBounds(Object.values(shapes).map(TLDR.getBounds))

      const { zoom } = pageState.camera
      const mx = (window.innerWidth - bounds.width * zoom) / 2 / zoom
      const my = (window.innerHeight - bounds.height * zoom) / 2 / zoom

      return {
        document: {
          ...data.document,
          pageStates: {
            [this.currentPageId]: {
              ...data.document.pageStates[this.currentPageId],
              camera: {
                ...data.document.pageStates[this.currentPageId].camera,
                point: Vec.round(Vec.add([-bounds.minX, -bounds.minY], [mx, my])),
              },
            },
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
    const { zoom, point } = this.pageState.camera
    const center = [window.innerWidth / 2, window.innerHeight / 2]
    const p0 = Vec.sub(Vec.div(center, zoom), point)
    const p1 = Vec.sub(Vec.div(center, next), point)

    this.setState((data) => {
      return {
        document: {
          ...data.document,
          pageStates: {
            [this.currentPageId]: {
              ...data.document.pageStates[this.currentPageId],
              camera: {
                point: Vec.round(Vec.add(point, Vec.sub(p1, p0))),
                zoom: next,
              },
            },
          },
        },
      }
    })

    return this
  }

  zoom = Utils.throttle((delta: number) => {
    const { zoom } = this.pageState.camera
    const nextZoom = TLDR.getCameraZoom(zoom - delta * zoom)
    this.zoomTo(nextZoom)
    return this
  }, 16)

  pan = (delta: number[]) => {
    const { camera } = this.pageState

    this.setState((data) => {
      return {
        document: {
          ...data.document,
          pageStates: {
            [this.currentPageId]: {
              ...data.document.pageStates[this.currentPageId],
              camera: {
                ...camera,
                point: Vec.round(Vec.sub(camera.point, delta)),
              },
            },
          },
        },
      }
    })
    return this
  }

  pinchZoom = (point: number[], delta: number[], zoomDelta: number) => {
    const { camera } = this.pageState
    const nextPoint = Vec.add(camera.point, Vec.div(delta, camera.zoom))
    const nextZoom = TLDR.getCameraZoom(camera.zoom - zoomDelta * camera.zoom)
    const p0 = Vec.sub(Vec.div(point, camera.zoom), nextPoint)
    const p1 = Vec.sub(Vec.div(point, nextZoom), nextPoint)

    this.setState((data) => {
      return {
        document: {
          ...data.document,
          pageStates: {
            [this.currentPageId]: {
              ...data.document.pageStates[this.currentPageId],
              camera: {
                point: Vec.round(Vec.add(nextPoint, Vec.sub(p1, p0))),
                zoom: nextZoom,
              },
            },
          },
        },
      }
    })
    return this
  }

  /* -------------------------------------------------- */
  /*                      Document                      */
  /* -------------------------------------------------- */

  private setCurrentPageId(pageId: string) {
    if (pageId === this.currentPageId) return this

    this.currentPageId = pageId

    this.setState((data) => ({
      appState: {
        ...data.appState,
        currentPageId: pageId,
      },
    }))

    return this
  }

  loadDocument = (document: TLDrawDocument, onChange?: TLDrawState['_onChange']) => {
    this._onChange = onChange
    this.currentDocumentId = document.id
    this.document = Utils.deepClone(document)
    this.currentPageId = Object.keys(document.pages)[0]
    this.selectHistory.pointer = 0
    this.selectHistory.stack = [[]]

    this.setState((data) => ({
      document: this.document,
      appState: {
        ...data.appState,
        currentPageId: this.currentPageId,
      },
    }))

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
      const nextPage = { ...this.page }

      const nextPageState = { ...this.pageState }

      const nextAppState = { ...this.appState }

      nextPage.shapes = {
        ...nextPage.shapes,
        ...Object.fromEntries(nextPageState.selectedIds.map((id) => [id, undefined] as any)),
      }

      nextPageState.selectedIds = []
      nextPageState.editingId = undefined
      nextPageState.bindingId = undefined
      nextPageState.hoveredId = undefined

      nextAppState.status = {
        current: TLDrawStatus.Idle,
        previous: this.appState.status.previous,
      }

      this.setState((data) => ({
        ...data,
        document: {
          ...data.document,
          pages: {
            ...data.document.pages,
            [this.currentPageId]: nextPage,
          },
          pageStates: {
            ...data.document.pageStates,
            [this.currentPageId]: nextPageState,
          },
          appState: nextAppState,
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

      this.isCreating = false

      this.do(result)
    } else {
      this.setState((data) => Utils.deepMerge<Data>(data, result), TLDrawStatus.Idle)
      this._onChange?.(this, `session:complete:${session.id}`)
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

    this.setState(
      (data) =>
        Object.fromEntries(
          Object.entries(command.after).map(([key, partial]) => {
            return [key, Utils.deepMerge(data[key as keyof Data], partial)]
          })
        ),
      TLDrawStatus.Idle
    )

    this.clearSelectHistory()

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

    this.clearSelectHistory()

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

    this.addToSelectHistory(this.selectedIds)

    this._onChange?.(this, `redo:${command.id}`)

    return this
  }

  /* -------------------------------------------------- */
  /*                      Selection                     */
  /* -------------------------------------------------- */

  setSelectedIds(ids: string[], push = false) {
    this.setState((data) => {
      return {
        document: {
          ...data.document,
          pageStates: {
            [this.currentPageId]: {
              ...this.pageState,
              selectedIds: push ? [...this.pageState.selectedIds, ...ids] : [...ids],
            },
          },
        },
      }
    })
    return this
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
    this.setState((data) => ({
      appState: {
        ...this.appState,
        activeTool: 'select',
        activeToolType: 'select',
      },
      document: {
        ...data.document,
        pageStates: {
          [this.currentPageId]: {
            ...this.pageState,
            selectedIds: Object.keys(this.page.shapes),
          },
        },
      },
    }))
    this.addToSelectHistory(this.selectedIds)
    return this
  }

  deselectAll = () => {
    this.setState((data) => ({
      appState: {
        ...this.appState,
        activeTool: 'select',
        activeToolType: 'select',
      },
      document: {
        ...data.document,
        pageStates: {
          [this.currentPageId]: {
            ...this.pageState,
            selectedIds: [],
          },
        },
      },
    }))

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
    const newId = Utils.uniqueId()
    this.setState((data) => ({
      document: {
        ...data.document,
        pages: {
          ...data.document.pages,
          [newId]: { id: newId, shapes: {}, bindings: {} },
        },
        pageStates: {
          ...data.document.pageStates,
          [newId]: {
            id: newId,
            selectedIds: [],
            camera: { point: [-window.innerWidth / 2, -window.innerHeight / 2], zoom: 1 },
          },
        },
      },
    }))

    this.changePage(newId)
    return this
  }

  changePage(id: string) {
    this.setCurrentPageId(id)
    return this
  }

  renamePage(id: string, name: string) {
    this.document.pages[id] = { ...this.document.pages[id], name }
    return this
  }

  duplicatePage(id: string = this.currentPageId) {
    const newId = Utils.uniqueId()

    this.setState((data) => ({
      document: {
        ...data.document,
        pages: {
          ...data.document.pages,
          [newId]: { ...this.document.pages[id], id: newId },
        },
        pageStates: {
          ...data.document.pageStates,
          [newId]: {
            id: newId,
            selectedIds: [],
            camera: this.document.pageStates[id].camera,
          },
        },
      },
    }))

    this.changePage(newId)
    return this
  }

  deletePage(id: string = this.currentPageId) {
    const pages = Object.values(this.document.pages).sort(
      (a, b) => (a.childIndex || 0) - (b.childIndex || 0)
    )

    const currentIndex = pages.findIndex((page) => page.id === this.currentPageId)

    if (Object.values(this.document.pages).length <= 1) return

    const nextPages = { ...this.document.pages }
    const nextPageStates = { ...this.document.pageStates }
    delete nextPages[id]
    delete nextPageStates[id]

    this.setState((data) => ({
      document: {
        ...data.document,
        pages: nextPages,
        pageStates: nextPageStates,
      },
    }))

    if (id === this.currentPageId) {
      if (currentIndex === pages.length - 1) {
        this.changePage(pages[pages.length - 2].id)
      } else {
        this.changePage(pages[currentIndex + 1].id)
      }
    }

    return this
  }

  copy = (ids?: string[]) => {
    const data = this.store.getState()
    const idsToCopy = ids ? ids : this.selectedIds

    this.clipboard = idsToCopy.map((id) => {
      const shape = this.getShape(id)

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

      const shapes = this.getShapes()

      const childIndex =
        shapes.length === 0
          ? 1
          : shapes.sort((a, b) => b.childIndex - a.childIndex)[0].childIndex + 1

      return {
        document: {
          ...data.document,
          pages: {
            ...data.document.pages,
            [this.currentPageId]: {
              ...this.page,
              shapes: {
                ...this.page.shapes,
                [id]: utils.create({
                  id,
                  parentId: this.currentPageId,
                  childIndex,
                  point: pagePoint,
                  style: { ...data.appState.currentStyle },
                }),
              },
            },
          },
          pageStates: {
            ...data.document.pageStates,
            [this.currentPageId]: {
              ...this.pageState,
              selectedIds: [id],
            },
          },
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
    this.setState((data) => ({
      document: {
        ...data.document,
        pageStates: {
          [this.currentPageId]: {
            ...this.pageState,
            hoveredId: info.target,
          },
        },
      },
    }))
  }

  onUnhoverShape: TLPointerEventHandler = (info) => {
    setTimeout(() => {
      if (this.pageState.hoveredId === info.target) {
        this.setState((data) => ({
          document: {
            ...data.document,
            pageStates: {
              [this.currentPageId]: {
                ...this.pageState,
                hoveredId: undefined,
              },
            },
          },
        }))
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

  get data() {
    return this.getState()
  }

  get selectedIds() {
    return this.pageState.selectedIds
  }
  get page() {
    return this.getPage()
  }

  get shapes() {
    return this.getShapes()
  }

  get bindings() {
    return this.getPage().bindings
  }

  get pageState() {
    return this.getPageState()
  }

  get appState() {
    return this.getAppState()
  }

  get status() {
    return this.appState.status
  }
}
