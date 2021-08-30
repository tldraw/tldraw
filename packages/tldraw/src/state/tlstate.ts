import { StateManager } from 'rko'
import {
  TLBoundsCorner,
  TLBoundsEdge,
  TLBoundsEventHandler,
  TLBoundsHandleEventHandler,
  TLCanvasEventHandler,
  TLKeyboardInfo,
  TLPageState,
  TLPinchEventHandler,
  TLPointerEventHandler,
  TLWheelEventHandler,
  Utils,
  Vec,
  brushUpdater,
  TLPointerInfo,
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
  TLDrawStatus,
  ParametersExceptFirst,
  SelectHistory,
  TLDrawPage,
  TLDrawBinding,
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

export class TLDrawState extends StateManager<Data> {
  _onChange?: (tlstate: TLDrawState, data: Data, reason: string) => void

  constructor() {
    super(initialData, 'tlstate', 1)
  }

  selectHistory: SelectHistory = {
    stack: [[]],
    pointer: 0,
  }

  /* -------------------- Internal -------------------- */

  protected onStateWillChange = (state: Data, id: string): void => {
    if (!id.startsWith('patch')) {
      this.selectHistory.stack = [[]]
      this.selectHistory.pointer = 0
    }
  }

  protected onStateDidChange = (state: Data, id: string): void => {
    this._onChange?.(this, state, id)
  }

  protected cleanup = (state: Data, prev: Data) => {
    const data = { ...state }

    // Remove deleted shapes and bindings (in Commands, these will be set to undefined)
    if (data.document !== prev.document) {
      Object.entries(data.document.pages).forEach(([pageId, page]) => {
        if (page === undefined) {
          // If page is undefined, delete the page and pagestate
          delete data.document.pages[pageId]
          delete data.document.pageStates[pageId]
          return
        }

        const prevPage = prev.document.pages[pageId]

        if (!prevPage || page.shapes !== prevPage.shapes || page.bindings !== prevPage.bindings) {
          page.shapes = { ...page.shapes }
          page.bindings = { ...page.bindings }

          // If shape is undefined, delete the shape
          Object.keys(page.shapes).forEach((id) => {
            if (!page.shapes[id]) delete page.shapes[id]
          })

          // If binding is undefined, delete the binding
          Object.keys(page.bindings).forEach((id) => {
            if (!page.bindings[id]) delete page.bindings[id]
          })

          // Find which shapes have changed
          const changedShapeIds = Object.values(page.shapes)
            .filter((shape) => prevPage?.shapes[shape.id] !== shape)
            .map((shape) => shape.id)

          data.document.pages[pageId] = page

          // Get bindings related to the changed shapes
          const bindingsToUpdate = TLDR.getRelatedBindings(data, changedShapeIds, pageId)

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
          ...data.document.pageStates[pageId],
        }

        if (nextPageState.hoveredId && !page.shapes[nextPageState.hoveredId]) {
          delete nextPageState.hoveredId
        }

        if (nextPageState.bindingId && !page.bindings[nextPageState.bindingId]) {
          console.warn('Could not find the binding binding!', pageId)
          delete nextPageState.bindingId
        }

        if (nextPageState.editingId && !page.shapes[nextPageState.editingId]) {
          console.warn('Could not find the editing shape!')
          delete nextPageState.editingId
        }

        data.document.pageStates[pageId] = nextPageState
      })
    }

    const currentPageId = data.appState.currentPageId

    // Apply selected style change, if any

    const newSelectedStyle = TLDR.getSelectedStyle(data, currentPageId)

    if (newSelectedStyle) {
      data.appState = {
        ...data.appState,
        selectedStyle: newSelectedStyle,
      }
    }

    // Check that the correct page id is active (delete me?)

    if (data.document.pageStates[currentPageId].id !== currentPageId) {
      throw Error('Current page id is not the current page state!')
    }

    return data
  }

  private setStatus(status: TLDrawStatus) {
    return this.patchState({
      appState: { status: { current: status, previous: this.appState.status.current } },
    })
  }

  clipboard?: TLDrawShape[]

  session?: Session

  pointedId?: string

  pointedHandle?: string

  pointedBoundsHandle?: TLBoundsCorner | TLBoundsEdge | 'rotate'

  isCreating = false

  /* -------------------- Settings -------------------- */

  togglePenMode = (): this => {
    return this.patchState(
      {
        settings: {
          isPenMode: !this.state.settings.isPenMode,
        },
      },
      `settings:toggled_pen_mode`
    )
  }

  toggleDarkMode = (): this => {
    return this.patchState(
      { settings: { isDarkMode: !this.state.settings.isDarkMode } },
      `settings:toggled_dark_mode`
    )
  }

  toggleDebugMode = () => {
    return this.patchState(
      { settings: { isDebugMode: !this.state.settings.isDebugMode } },
      `settings:toggled_debug`
    )
  }

  /* ----------------------- UI ----------------------- */
  toggleStylePanel = (): this => {
    return this.patchState(
      { appState: { isStyleOpen: !this.appState.isStyleOpen } },
      'ui:toggled_style_panel'
    )
  }

  selectTool = (tool: TLDrawShapeType | 'select'): this => {
    return this.patchState(
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

  toggleToolLock = (): this => {
    return this.patchState(
      {
        appState: {
          isToolLocked: !this.appState.isToolLocked,
        },
      },
      `toggled_tool_lock`
    )
  }

  /* --------------------- Camera --------------------- */

  setCamera = (point: number[], zoom: number, reason: string): this => {
    return this.patchState(
      {
        document: {
          pageStates: {
            [this.currentPageId]: { camera: { point, zoom } },
          },
        },
      },
      reason
    )
  }

  resetCamera = (): this => {
    return this.setCamera(
      Vec.round([window.innerWidth / 2, window.innerHeight / 2]),
      1,
      `reset_camera`
    )
  }

  pan = (delta: number[]): this => {
    const { camera } = this.pageState
    return this.setCamera(Vec.round(Vec.sub(camera.point, delta)), camera.zoom, `panned`)
  }

  pinchZoom = (point: number[], delta: number[], zoomDelta: number): this => {
    const { camera } = this.pageState
    const nextPoint = Vec.add(camera.point, Vec.div(delta, camera.zoom))
    const nextZoom = TLDR.getCameraZoom(camera.zoom - zoomDelta * camera.zoom)
    const p0 = Vec.sub(Vec.div(point, camera.zoom), nextPoint)
    const p1 = Vec.sub(Vec.div(point, nextZoom), nextPoint)
    return this.setCamera(Vec.round(Vec.add(nextPoint, Vec.sub(p1, p0))), nextZoom, `pinch_zoomed`)
  }

  zoomTo = (next: number): this => {
    const { zoom, point } = this.pageState.camera
    const center = [window.innerWidth / 2, window.innerHeight / 2]
    const p0 = Vec.sub(Vec.div(center, zoom), point)
    const p1 = Vec.sub(Vec.div(center, next), point)
    return this.setCamera(Vec.round(Vec.add(point, Vec.sub(p1, p0))), next, `zoomed_camera`)
  }

  zoomIn = (): this => {
    const i = Math.round((this.pageState.camera.zoom * 100) / 25)
    const nextZoom = TLDR.getCameraZoom((i + 1) * 0.25)
    return this.zoomTo(nextZoom)
  }

  zoomOut = (): this => {
    const i = Math.round((this.pageState.camera.zoom * 100) / 25)
    const nextZoom = TLDR.getCameraZoom((i - 1) * 0.25)
    return this.zoomTo(nextZoom)
  }

  zoomToFit = (): this => {
    const shapes = this.getShapes()

    if (shapes.length === 0) return this

    const bounds = Utils.getCommonBounds(Object.values(shapes).map(TLDR.getBounds))

    const zoom = TLDR.getCameraZoom(
      bounds.width > bounds.height
        ? (window.innerWidth - 128) / bounds.width
        : (window.innerHeight - 128) / bounds.height
    )

    const mx = (window.innerWidth - bounds.width * zoom) / 2 / zoom
    const my = (window.innerHeight - bounds.height * zoom) / 2 / zoom

    return this.setCamera(
      Vec.round(Vec.add([-bounds.minX, -bounds.minY], [mx, my])),
      this.pageState.camera.zoom,
      `zoomed_to_fit`
    )
  }

  zoomToSelection = (): this => {
    if (this.pageState.selectedIds.length === 0) return this

    const bounds = TLDR.getSelectedBounds(this.state)

    const zoom = TLDR.getCameraZoom(
      bounds.width > bounds.height
        ? (window.innerWidth - 128) / bounds.width
        : (window.innerHeight - 128) / bounds.height
    )

    const mx = (window.innerWidth - bounds.width * zoom) / 2 / zoom
    const my = (window.innerHeight - bounds.height * zoom) / 2 / zoom

    return this.setCamera(
      Vec.round(Vec.add([-bounds.minX, -bounds.minY], [mx, my])),
      this.pageState.camera.zoom,
      `zoomed_to_selection`
    )
  }

  zoomToContent = (): this => {
    const shapes = this.getShapes()
    const pageState = this.pageState

    if (shapes.length === 0) return this

    const bounds = Utils.getCommonBounds(Object.values(shapes).map(TLDR.getBounds))

    const { zoom } = pageState.camera
    const mx = (window.innerWidth - bounds.width * zoom) / 2 / zoom
    const my = (window.innerHeight - bounds.height * zoom) / 2 / zoom

    return this.setCamera(
      Vec.round(Vec.add([-bounds.minX, -bounds.minY], [mx, my])),
      this.pageState.camera.zoom,
      `zoomed_to_content`
    )
  }

  zoomToActual = (): this => {
    return this.zoomTo(1)
  }

  zoom = Utils.throttle((delta: number): this => {
    const { zoom } = this.pageState.camera
    const nextZoom = TLDR.getCameraZoom(zoom - delta * zoom)
    return this.zoomTo(nextZoom)
  }, 16)

  /* -------------------- Getters --------------------- */

  getShape = <T extends TLDrawShape = TLDrawShape>(id: string, pageId = this.currentPageId): T => {
    return TLDR.getShape<T>(this.state, id, pageId)
  }

  getPage = (pageId = this.currentPageId): TLDrawPage => {
    return TLDR.getPage(this.state, pageId || this.currentPageId)
  }

  getShapes = (pageId = this.currentPageId): TLDrawShape[] => {
    return TLDR.getShapes(this.state, pageId || this.currentPageId)
  }

  getBindings = (pageId = this.currentPageId): TLDrawBinding[] => {
    return TLDR.getBindings(this.state, pageId || this.currentPageId)
  }

  getPageState = (pageId = this.currentPageId): TLPageState => {
    return TLDR.getPageState(this.state, pageId || this.currentPageId)
  }

  getAppState = (): Data['appState'] => {
    return this.state.appState
  }

  getPagePoint = (point: number[], pageId = this.currentPageId): number[] => {
    const { camera } = this.getPageState(pageId)
    return Vec.sub(Vec.div(point, camera.zoom), camera.point)
  }

  get selectedIds(): string[] {
    return this.pageState.selectedIds
  }

  get page(): TLDrawPage {
    return this.state.document.pages[this.currentPageId]
  }

  get shapes(): TLDrawShape[] {
    return Object.values(this.page.shapes)
  }

  get bindings(): TLDrawBinding[] {
    return Object.values(this.page.bindings)
  }

  get pageState(): TLPageState {
    return this.state.document.pageStates[this.currentPageId]
  }

  get appState(): Data['appState'] {
    return this.state.appState
  }

  get currentPageId(): string {
    return this.state.appState.currentPageId
  }

  get document(): TLDrawDocument {
    return this.state.document
  }

  /* -------------------------------------------------- */
  /*                      Document                      */
  /* -------------------------------------------------- */

  loadDocument = (document: TLDrawDocument, onChange?: TLDrawState['_onChange']): this => {
    this._onChange = onChange
    this.resetHistory()

    // this.selectHistory.pointer = 0
    // this.selectHistory.stack = [[]]

    return this.replaceState({
      ...this.state,
      appState: {
        ...this.appState,
        currentPageId: Object.keys(document.pages)[0],
      },
      document: {
        ...document,
        pages: Object.fromEntries(
          Object.entries(document.pages)
            .sort((a, b) => (a[1].childIndex || 0) - (b[1].childIndex || 0))
            .map(([id, page], i) => {
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
    })
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
  /*                        Pages                       */
  /* -------------------------------------------------- */

  createPage = (): this => {
    return this.setState(Commands.createPage(this.state))
  }

  changePage = (pageId: string): this => {
    return this.setState(Commands.changePage(this.state, pageId))
  }

  renamePage = (pageId: string, name: string): this => {
    return this.setState(Commands.renamePage(this.state, pageId, name))
  }

  duplicatePage = (pageId: string): this => {
    return this.setState(Commands.duplicatePage(this.state, pageId))
  }

  deletePage = (pageId?: string): this => {
    if (Object.values(this.document.pages).length <= 1) return this
    return this.setState(Commands.deletePage(this.state, pageId ? pageId : this.currentPageId))
  }

  /* -------------------------------------------------- */
  /*                      Clipboard                     */
  /* -------------------------------------------------- */

  copy = (ids = this.selectedIds): this => {
    this.clipboard = ids.map((id) => {
      const shape = this.getShape(id, this.currentPageId)

      return {
        ...shape,
        id: Utils.uniqueId(),
        childIndex: TLDR.getChildIndexAbove(this.state, id, this.currentPageId),
      }
    })

    return this
  }

  paste = (string?: string): this => {
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
          parentId: this.appState.currentPageId,
          childIndex,
          point: this.getPagePoint([window.innerWidth / 2, window.innerHeight / 2]),
          style: { ...this.appState.currentStyle },
        })

        const boundsCenter = Utils.centerBounds(
          TLDR.getShapeUtils(shape).getBounds(shape),
          this.getPagePoint([window.innerWidth / 2, window.innerHeight / 2])
        )

        this.create(
          TLDR.getShapeUtils(TLDrawShapeType.Text).create({
            id: Utils.uniqueId(),
            parentId: this.appState.currentPageId,
            childIndex,
            point: [boundsCenter.minX, boundsCenter.minY],
          })
        )
      }

      return this
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

  /* -------------------------------------------------- */
  /*                      Sessions                      */
  /* -------------------------------------------------- */

  startSession<T extends Session>(session: T, ...args: ParametersExceptFirst<T['start']>): this {
    this.session = session
    const result = session.start(this.state, ...args)
    if (result) {
      return this.patchState(
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
    }

    return this.setStatus(session.status)
  }

  updateSession<T extends Session>(...args: ParametersExceptFirst<T['update']>): this {
    const { session } = this
    if (!session) return this
    const patch = session.update(this.state, ...args)
    if (!patch) return this
    return this.patchState(patch, `session:update:${session.id}`)
  }

  cancelSession<T extends Session>(...args: ParametersExceptFirst<T['cancel']>): this {
    const { session } = this
    if (!session) return this
    this.session = undefined

    if (this.isCreating) {
      this.isCreating = false
      return this.patchState(
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
                  ...Object.fromEntries(this.selectedIds.map((id) => [id, undefined])),
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
    }

    return this.patchState(
      {
        ...session.cancel(this.state, ...args),
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

  completeSession<T extends Session>(...args: ParametersExceptFirst<T['complete']>) {
    const { session } = this
    if (!session) return this

    const result = session.complete(this.state, ...args)

    this.session = undefined

    if (result === undefined) {
      this.isCreating = false
      return this.patchState(
        {
          appState: {
            status: {
              current: TLDrawStatus.Idle,
              previous: this.appState.status.previous,
            },
          },
          document: {
            pageStates: {
              [this.currentPageId]: {
                editingId: undefined,
              },
            },
          },
        },
        `session:complete:${session.id}`
      )
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

        // ...and set editingId back to undefined
        result.after = {
          ...result.after,
          document: {
            ...result.after.document,
            pageStates: {
              ...result.after.document?.pageStates,
              [this.currentPageId]: {
                ...(result.after.document?.pageStates || {})[this.currentPageId],
                editingId: undefined,
              },
            },
          },
        }

        if (this.appState.isToolLocked) {
          const pageState = result.after?.document?.pageStates?.[this.currentPageId] || {}
          pageState.selectedIds = []
        }

        this.isCreating = false
      }

      // Either way, set the status back to idle
      result.after.appState = {
        ...result.after.appState,
        status: {
          current: TLDrawStatus.Idle,
          previous: this.appState.status.previous,
        },
      }

      this.setState(result, `session:complete:${session.id}`)
    } else {
      this.patchState(
        {
          ...result,
          appState: {
            ...result.appState,
            status: {
              current: TLDrawStatus.Idle,
              previous: this.appState.status.previous,
            },
          },
          document: {
            pageStates: {
              [this.currentPageId]: {
                editingId: undefined,
              },
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
  /*                      Selection                     */
  /* -------------------------------------------------- */

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

  setSelectedIds(ids: string[], push = false) {
    return this.patchState(
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

  /* -------------------------------------------------- */
  /*                   Shape Functions                  */
  /* -------------------------------------------------- */

  style = (style: Partial<ShapeStyles>, ids = this.selectedIds) => {
    return this.setState(Commands.style(this.state, ids, style))
  }

  align = (type: AlignType, ids = this.selectedIds) => {
    return this.setState(Commands.align(this.state, ids, type))
  }

  distribute = (type: DistributeType, ids = this.selectedIds) => {
    return this.setState(Commands.distribute(this.state, ids, type))
  }

  stretch = (type: StretchType, ids = this.selectedIds) => {
    return this.setState(Commands.stretch(this.state, ids, type))
  }

  flipHorizontal = (ids = this.selectedIds) => {
    return this.setState(Commands.flip(this.state, ids, FlipType.Horizontal))
  }

  flipVertical = (ids = this.selectedIds) => {
    return this.setState(Commands.flip(this.state, ids, FlipType.Vertical))
  }

  moveToBack = (ids = this.selectedIds) => {
    return this.setState(Commands.move(this.state, ids, MoveType.ToBack))
  }

  moveBackward = (ids = this.selectedIds) => {
    return this.setState(Commands.move(this.state, ids, MoveType.Backward))
  }

  moveForward = (ids = this.selectedIds) => {
    return this.setState(Commands.move(this.state, ids, MoveType.Forward))
  }

  moveToFront = (ids = this.selectedIds) => {
    return this.setState(Commands.move(this.state, ids, MoveType.ToFront))
  }

  nudge = (delta: number[], isMajor = false, ids = this.selectedIds): this => {
    return this.setState(Commands.translate(this.state, ids, Vec.mul(delta, isMajor ? 10 : 1)))
  }

  duplicate = (ids = this.selectedIds): this => {
    return this.setState(Commands.duplicate(this.state, ids))
  }

  toggleHidden = (ids = this.selectedIds): this => {
    return this.setState(Commands.toggle(this.state, ids, 'isHidden'))
  }

  toggleLocked = (ids = this.selectedIds): this => {
    return this.setState(Commands.toggle(this.state, ids, 'isLocked'))
  }

  toggleAspectRatioLocked = (ids = this.selectedIds): this => {
    return this.setState(Commands.toggle(this.state, ids, 'isAspectRatioLocked'))
  }

  toggleDecoration = (handleId: string, ids = this.selectedIds): this => {
    if (handleId === 'start' || handleId === 'end') {
      return this.setState(Commands.toggleDecoration(this.state, ids, handleId))
    }

    return this
  }

  rotate = (delta = Math.PI * -0.5, ids = this.selectedIds): this => {
    return this.setState(Commands.rotate(this.state, ids, delta))
  }

  group = (): this => {
    // TODO
    //
    //
    // this.setState(Commands.toggle(this.state, ids, 'isAspectRatioLocked'))
    return this
  }

  create = (...shapes: TLDrawShape[]): this => {
    return this.setState(Commands.create(this.state, shapes))
  }

  delete = (ids = this.selectedIds): this => {
    if (ids.length === 0) return this

    return this.setState(Commands.deleteShapes(this.state, ids))
  }

  clear = (): this => {
    this.selectAll()
    this.delete()
    return this
  }

  cancel = (): this => {
    switch (this.state.appState.status.current) {
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

  /* -------------------- Sessions -------------------- */
  startBrushSession = (point: number[]): this => {
    return this.startSession(new Sessions.BrushSession(this.state, point))
  }

  updateBrushSession = (point: number[], metaKey = false): this => {
    return this.updateSession<Sessions.BrushSession>(point, metaKey)
  }

  startTranslateSession = (point: number[]): this => {
    return this.startSession(new Sessions.TranslateSession(this.state, point))
  }

  updateTranslateSession = (point: number[], shiftKey = false, altKey = false): this => {
    return this.updateSession<Sessions.TranslateSession>(point, shiftKey, altKey)
  }

  startTransformSession = (
    point: number[],
    handle: TLBoundsCorner | TLBoundsEdge | 'rotate',
    commandId?: string
  ): this => {
    const { selectedIds } = this

    if (selectedIds.length === 0) return this

    this.pointedBoundsHandle = handle

    if (this.pointedBoundsHandle === 'rotate') {
      return this.startSession(new Sessions.RotateSession(this.state, point))
    }

    if (this.selectedIds.length === 1) {
      return this.startSession(
        new Sessions.TransformSingleSession(this.state, point, this.pointedBoundsHandle, commandId)
      )
    }

    return this.startSession(
      new Sessions.TransformSession(this.state, point, this.pointedBoundsHandle)
    )
  }

  updateTransformSession = (point: number[], shiftKey = false, altKey = false): this => {
    return this.updateSession<Sessions.TransformSingleSession | Sessions.TransformSession>(
      point,
      shiftKey,
      altKey
    )
  }

  startTextSession = (id?: string): this => {
    return this.startSession(new Sessions.TextSession(this.state, id))
  }

  updateTextSession = (text: string): this => {
    return this.updateSession<Sessions.TextSession>(text)
  }

  startDrawSession = (id: string, point: number[]): this => {
    return this.startSession(new Sessions.DrawSession(this.state, id, point))
  }

  updateDrawSession = (point: number[], pressure: number, shiftKey = false): this => {
    return this.updateSession<Sessions.DrawSession>(point, pressure, shiftKey)
  }

  startHandleSession = (point: number[], handleId: string, commandId?: string): this => {
    const selectedShape = this.page.shapes[this.selectedIds[0]]
    if (selectedShape.type === TLDrawShapeType.Arrow) {
      return this.startSession<Sessions.ArrowSession>(
        new Sessions.ArrowSession(this.state, handleId as 'start' | 'end', point)
      )
    }

    return this.startSession<Sessions.HandleSession>(
      new Sessions.HandleSession(this.state, handleId, point, commandId)
    )
  }

  updateHandleSession = (
    point: number[],
    shiftKey = false,
    altKey = false,
    metaKey = false
  ): this => {
    return this.updateSession<Sessions.HandleSession | Sessions.ArrowSession>(
      point,
      shiftKey,
      altKey,
      metaKey
    )
  }

  updateOnPointerMove = (info: TLPointerInfo<string>): this => {
    switch (this.appState.status.current) {
      case TLDrawStatus.PointingBoundsHandle: {
        if (!this.pointedBoundsHandle) throw Error('No pointed bounds handle')
        if (Vec.dist(info.origin, info.point) > 4) {
          return this.startTransformSession(
            this.getPagePoint(info.origin),
            this.pointedBoundsHandle
          )
        }
        break
      }
      case TLDrawStatus.PointingHandle: {
        if (!this.pointedHandle) throw Error('No pointed handle')
        if (Vec.dist(info.origin, info.point) > 4) {
          return this.startHandleSession(this.getPagePoint(info.origin), this.pointedHandle)
        }
        break
      }
      case TLDrawStatus.PointingBounds: {
        if (Vec.dist(info.origin, info.point) > 4) {
          return this.startTranslateSession(this.getPagePoint(info.origin))
        }
        break
      }
      case TLDrawStatus.Brushing: {
        return this.updateBrushSession(this.getPagePoint(info.point), info.metaKey)
      }
      case TLDrawStatus.Translating: {
        return this.updateTranslateSession(
          this.getPagePoint(info.point),
          info.shiftKey,
          info.altKey
        )
      }
      case TLDrawStatus.Transforming: {
        return this.updateTransformSession(
          this.getPagePoint(info.point),
          info.shiftKey,
          info.altKey
        )
      }
      case TLDrawStatus.TranslatingHandle: {
        return this.updateHandleSession(
          this.getPagePoint(info.point),
          info.shiftKey,
          info.altKey,
          info.metaKey
        )
      }
      case TLDrawStatus.Creating: {
        switch (this.appState.activeToolType) {
          case 'draw': {
            return this.updateDrawSession(
              this.getPagePoint(info.point),
              info.pressure,
              info.shiftKey
            )
          }
          case 'bounds': {
            return this.updateTransformSession(this.getPagePoint(info.point), info.shiftKey)
          }
          case 'handle': {
            return this.updateHandleSession(
              this.getPagePoint(info.point),
              info.shiftKey,
              info.altKey,
              info.metaKey
            )
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

    return this
  }

  createActiveToolShape = (point: number[]): this => {
    const id = Utils.uniqueId()
    const pagePoint = Vec.round(this.getPagePoint(point))

    if (this.appState.activeTool === 'select') return this

    if (!this.appState.activeToolType) throw Error

    const utils = TLDR.getShapeUtils({ type: this.appState.activeTool } as TLDrawShape)

    const shapes = this.getShapes()

    const childIndex =
      shapes.length === 0 ? 1 : shapes.sort((a, b) => b.childIndex - a.childIndex)[0].childIndex + 1

    this.patchState(
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
              editingId: id,
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
        return this.startDrawSession(id, pagePoint)
      }
      case TLDrawToolType.Bounds: {
        return this.startTransformSession(
          pagePoint,
          TLBoundsCorner.BottomRight,
          `create_${activeTool}`
        )
      }
      case TLDrawToolType.Handle: {
        return this.startHandleSession(pagePoint, 'end', `create_${activeTool}`)
      }
      case TLDrawToolType.Text: {
        return this.startTextSession()
      }
      case TLDrawToolType.Point: {
        break
      }
      case TLDrawToolType.Points: {
        break
      }
    }

    return this
  }

  /* -------------------------------------------------- */
  /*                   Event Handlers                   */
  /* -------------------------------------------------- */

  /* ----------------- Keyboard Events ---------------- */

  onKeyDown = (key: string, info: TLKeyboardInfo) => {
    if (key === 'Escape') {
      this.cancel()
      return
    }

    switch (this.appState.status.current) {
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
    switch (this.appState.status.current) {
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
    this.setStatus(this.appState.status.previous)
  }

  onPinch: TLPinchEventHandler = (info) => {
    if (this.appState.status.current !== TLDrawStatus.Pinching) return

    this.pinchZoom(info.origin, info.delta, info.delta[2] / 350)
    this.updateOnPointerMove(info)
  }

  onPan: TLWheelEventHandler = (info) => {
    if (this.appState.status.current === TLDrawStatus.Pinching) return
    // TODO: Pan and pinchzoom are firing at the same time. Considering turning one of them off!

    const delta = Vec.div(info.delta, this.pageState.camera.zoom)
    const prev = this.pageState.camera.point
    const next = Vec.sub(prev, delta)

    if (Vec.isEqual(next, prev)) return

    this.pan(delta)
    this.updateOnPointerMove(info)
  }

  onZoom: TLWheelEventHandler = (info) => {
    this.zoom(info.delta[2] / 100)
    this.updateOnPointerMove(info)
  }

  // Pointer Events
  onPointerDown: TLPointerEventHandler = (info) => {
    switch (this.appState.status.current) {
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

  onPointerMove: TLPointerEventHandler = (info) => {
    this.updateOnPointerMove(info)
  }

  onPointerUp: TLPointerEventHandler = (info) => {
    switch (this.appState.status.current) {
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
    if (this.appState.isStyleOpen) {
      this.toggleStylePanel()
    }

    switch (this.appState.status.current) {
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
    switch (this.appState.status.current) {
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
    switch (this.appState.status.current) {
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

  onRightPointShape: TLPointerEventHandler = (info) => {
    if (!this.selectedIds.includes(info.target)) {
      this.select(info.target)
    }
  }

  onDragShape: TLPointerEventHandler = () => {
    // Unused
  }

  onHoverShape: TLPointerEventHandler = (info) => {
    this.patchState(
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
        this.patchState(
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
    switch (this.appState.status.current) {
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
      this.patchState(
        {
          appState: {
            isEmptyCanvas: false,
          },
        },
        'empty_canvas:false'
      )
    } else if (!appState.isEmptyCanvas && ids.length <= 0) {
      this.patchState(
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
}

export const tlstate = new TLDrawState()
