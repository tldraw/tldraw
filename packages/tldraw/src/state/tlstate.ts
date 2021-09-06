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
  inputs,
  TLBounds,
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
  GroupShape,
} from '~types'
import { TLDR } from './tldr'
import { defaultStyle } from '~shape'
import * as Sessions from './session'
import * as Commands from './command'

const defaultDocument: TLDrawDocument = {
  id: 'doc',
  pages: {
    page: {
      id: 'page',
      name: 'Page 1',
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
}

const initialData: Data = {
  settings: {
    isPenMode: false,
    isDarkMode: false,
    isZoomSnap: true,
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
  document: defaultDocument,
}

export class TLDrawState extends StateManager<Data> {
  private _onChange?: (tlstate: TLDrawState, data: Data, reason: string) => void
  private _onMount?: (tlstate: TLDrawState) => void

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

  selectedGroupId?: string

  constructor(
    id = Utils.uniqueId(),
    onChange?: (tlstate: TLDrawState, data: Data, reason: string) => void,
    onMount?: (tlstate: TLDrawState) => void
  ) {
    super(initialData, id, 2, (prev, next, prevVersion) => {
      const state = { ...prev }
      if (prevVersion === 1)
        state.settings = {
          ...state.settings,
          isZoomSnap: next.settings.isZoomSnap,
        }
      return state
    })

    this._onChange = onChange
    this._onMount = onMount

    this.session = undefined
    this.pointedId = undefined
  }
  /* -------------------- Internal -------------------- */

  onReady = () => {
    this._onMount?.(this)
  }

  /**
   * Cleanup the state after each state change.
   * @param state The new state
   * @param prev The previous state
   * @protected
   * @returns The final state
   */
  protected cleanup = (state: Data, prev: Data): Data => {
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

          const groupsToUpdate = new Set<GroupShape>()

          // If shape is undefined, delete the shape
          Object.keys(page.shapes).forEach((id) => {
            const shape = page.shapes[id]
            let parentId: string

            if (!shape) {
              parentId = prevPage.shapes[id]?.parentId
              delete page.shapes[id]
            } else {
              parentId = shape.parentId
            }

            // If the shape is the child of a group, then update the group
            // (unless the group is being deleted too)
            if (parentId && parentId !== pageId) {
              const group = page.shapes[parentId]
              if (group !== undefined) {
                groupsToUpdate.add(page.shapes[parentId] as GroupShape)
              }
            }
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

          groupsToUpdate.forEach((group) => {
            if (!group) throw Error('no group!')
            const children = group.children.filter((id) => page.shapes[id] !== undefined)

            const commonBounds = Utils.getCommonBounds(
              children
                .map((id) => page.shapes[id])
                .filter(Boolean)
                .map((shape) => TLDR.getRotatedBounds(shape))
            )

            page.shapes[group.id] = {
              ...group,
              point: [commonBounds.minX, commonBounds.minY],
              size: [commonBounds.width, commonBounds.height],
              children,
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

  /**
   * Clear the selection history after each new command, undo or redo.
   * @param state
   * @param id
   */
  protected onStateDidChange = (state: Data, id: string): void => {
    if (!id.startsWith('patch')) {
      this.clearSelectHistory()
    }

    this._onChange?.(this, state, id)
  }

  /**
   * Set the current status.
   * @param status The new status to set.
   * @private
   * @returns
   */
  private setStatus(status: TLDrawStatus) {
    return this.patchState(
      {
        appState: { status: { current: status, previous: this.appState.status.current } },
      },
      `set_status:${status}`
    )
  }

  /* -------------------------------------------------- */
  /*                    Settings & UI                   */
  /* -------------------------------------------------- */

  /**
   * Toggle pen mode.
   */
  togglePenMode = (): this => {
    if (this.session) return this
    return this.patchState(
      {
        settings: {
          isPenMode: !this.state.settings.isPenMode,
        },
      },
      `settings:toggled_pen_mode`
    )
  }

  /**
   * Toggle dark mode.
   */
  toggleDarkMode = (): this => {
    if (this.session) return this
    this.patchState(
      { settings: { isDarkMode: !this.state.settings.isDarkMode } },
      `settings:toggled_dark_mode`
    )
    this.persist()
    return this
  }

  /**
   * Toggle zoom snap.
   */
  toggleZoomSnap = () => {
    if (this.session) return this
    this.patchState(
      { settings: { isZoomSnap: !this.state.settings.isZoomSnap } },
      `settings:toggled_zoom_snap`
    )
    this.persist()
    return this
  }

  /**
   * Toggle debug mode.
   */
  toggleDebugMode = () => {
    if (this.session) return this
    this.patchState(
      { settings: { isDebugMode: !this.state.settings.isDebugMode } },
      `settings:toggled_debug`
    )
    this.persist()
    return this
  }

  /**
   * Toggle the style panel.
   */
  toggleStylePanel = (): this => {
    if (this.session) return this
    this.patchState(
      { appState: { isStyleOpen: !this.appState.isStyleOpen } },
      'ui:toggled_style_panel'
    )
    this.persist()
    return this
  }

  /**
   * Select a tool.
   * @param tool The tool to select, or "select".
   */
  selectTool = (tool: TLDrawShapeType | 'select'): this => {
    if (this.session) return this
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

  /**
   * Toggle the tool lock option.
   */
  toggleToolLock = (): this => {
    if (this.session) return this
    return this.patchState(
      {
        appState: {
          isToolLocked: !this.appState.isToolLocked,
        },
      },
      `toggled_tool_lock`
    )
  }

  /* -------------------------------------------------- */
  /*                      Document                      */
  /* -------------------------------------------------- */

  /**
   * Reset the document to a blank state.
   */
  resetDocument = (): this => {
    if (this.session) return this
    this.session = undefined
    this.selectedGroupId = undefined
    this.resetHistory()
      .clearSelectHistory()
      .loadDocument(defaultDocument)
      .patchState(
        {
          appState: {
            status: {
              current: TLDrawStatus.Idle,
              previous: TLDrawStatus.Idle,
            },
          },
          document: {
            pageStates: {
              [this.currentPageId]: {
                bindingId: undefined,
                editingId: undefined,
                hoveredId: undefined,
                pointedId: undefined,
              },
            },
          },
        },
        'reset_document'
      )
      .persist()
    return this
  }

  /**
   * Load a new document.
   * @param document The document to load
   */
  loadDocument = (document: TLDrawDocument): this => {
    this.deselectAll()
    this.resetHistory()
    this.clearSelectHistory()
    this.session = undefined
    this.selectedGroupId = undefined

    return this.replaceState(
      {
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
      },
      `loaded_document:${document.id}`
    )
  }

  /**
   * Create a new project.
   * Should move to the www layer.
   * @todo
   */
  newProject = () => {
    // TODO
  }

  /**
   * Save the current project.
   * Should move to the www layer.
   * @todo
   */
  saveProject = () => {
    // TODO
  }

  /**
   * Load a project from the filesystem.
   * Should move to the www layer.
   * @todo
   */
  loadProject = () => {
    // TODO
  }

  /**
   * Sign out of the current account.
   * Should move to the www layer.
   * @todo
   */
  signOut = () => {
    // TODO
  }
  /* -------------------- Getters --------------------- */

  /**
   * Get the current app state.
   */
  getAppState = (): Data['appState'] => {
    return this.appState
  }

  /**
   * Get a page.
   * @param pageId (optional) The page's id.
   */
  getPage = (pageId = this.currentPageId): TLDrawPage => {
    return TLDR.getPage(this.state, pageId || this.currentPageId)
  }

  /**
   * Get the shapes (as an array) from a given page.
   * @param pageId (optional) The page's id.
   */
  getShapes = (pageId = this.currentPageId): TLDrawShape[] => {
    return TLDR.getShapes(this.state, pageId || this.currentPageId)
  }

  /**
   * Get the bindings from a given page.
   * @param pageId (optional) The page's id.
   */
  getBindings = (pageId = this.currentPageId): TLDrawBinding[] => {
    return TLDR.getBindings(this.state, pageId || this.currentPageId)
  }

  /**
   * Get a shape from a given page.
   * @param id The shape's id.
   * @param pageId (optional) The page's id.
   */
  getShape = <T extends TLDrawShape = TLDrawShape>(id: string, pageId = this.currentPageId): T => {
    return TLDR.getShape<T>(this.state, id, pageId)
  }

  /**
   * Get the bounds of a shape on a given page.
   * @param id The shape's id.
   * @param pageId (optional) The page's id.
   */
  getShapeBounds = (id: string, pageId = this.currentPageId): TLBounds => {
    return TLDR.getBounds(this.getShape(id, pageId))
  }

  greet() {
    return 'hello'
  }

  /**
   * Get a binding from a given page.
   * @param id The binding's id.
   * @param pageId (optional) The page's id.
   */
  getBinding = (id: string, pageId = this.currentPageId): TLDrawBinding => {
    return TLDR.getBinding(this.state, id, pageId)
  }

  /**
   * Get the page state for a given page.
   * @param pageId (optional) The page's id.
   */
  getPageState = (pageId = this.currentPageId): TLPageState => {
    return TLDR.getPageState(this.state, pageId || this.currentPageId)
  }

  /**
   * Turn a screen point into a point on the page.
   * @param point The screen point
   * @param pageId (optional) The page to use
   */
  getPagePoint = (point: number[], pageId = this.currentPageId): number[] => {
    const { camera } = this.getPageState(pageId)
    return Vec.sub(Vec.div(point, camera.zoom), camera.point)
  }

  /**
   * Get the current undo/redo stack.
   */
  get history() {
    return this.stack
  }

  /**
   * The current document.
   */
  get document(): TLDrawDocument {
    return this.state.document
  }

  /**
   * The current app state.
   */
  get appState(): Data['appState'] {
    return this.state.appState
  }

  /**
   * The current page id.
   */
  get currentPageId(): string {
    return this.state.appState.currentPageId
  }

  /**
   * The current page.
   */
  get page(): TLDrawPage {
    return this.state.document.pages[this.currentPageId]
  }

  /**
   * The current page's shapes (as an array).
   */
  get shapes(): TLDrawShape[] {
    return Object.values(this.page.shapes)
  }

  /**
   * The current page's bindings.
   */
  get bindings(): TLDrawBinding[] {
    return Object.values(this.page.bindings)
  }

  /**
   * The current page's state.
   */
  get pageState(): TLPageState {
    return this.state.document.pageStates[this.currentPageId]
  }

  /**
   * The page's current selected ids.
   */
  get selectedIds(): string[] {
    return this.pageState.selectedIds
  }

  /* -------------------------------------------------- */
  /*                        Pages                       */
  /* -------------------------------------------------- */

  /**
   * Create a new page.
   * @param pageId (optional) The new page's id.
   */
  createPage = (id?: string): this => {
    return this.setState(Commands.createPage(this.state, id))
  }

  /**
   * Change the current page.
   * @param pageId The new current page's id.
   */
  changePage = (pageId: string): this => {
    return this.setState(Commands.changePage(this.state, pageId))
  }

  /**
   * Rename a page.
   * @param pageId The id of the page to rename.
   * @param name The page's new name
   */
  renamePage = (pageId: string, name: string): this => {
    return this.setState(Commands.renamePage(this.state, pageId, name))
  }

  /**
   * Duplicate a page.
   * @param pageId The id of the page to duplicate.
   */
  duplicatePage = (pageId: string): this => {
    return this.setState(Commands.duplicatePage(this.state, pageId))
  }

  /**
   * Delete a page.
   * @param pageId The id of the page to delete.
   */
  deletePage = (pageId?: string): this => {
    if (Object.values(this.document.pages).length <= 1) return this
    return this.setState(Commands.deletePage(this.state, pageId ? pageId : this.currentPageId))
  }

  /* -------------------------------------------------- */
  /*                      Clipboard                     */
  /* -------------------------------------------------- */

  /**
   * Copy one or more shapes to the clipboard.
   * @param ids The ids of the shapes to copy.
   */
  copy = (ids = this.selectedIds): this => {
    this.clipboard = ids
      .flatMap((id) => TLDR.getDocumentBranch(this.state, id, this.currentPageId))
      .map((id) => {
        const shape = this.getShape(id, this.currentPageId)

        return {
          ...shape,
          id: Utils.uniqueId(),
          childIndex: TLDR.getChildIndexAbove(this.state, id, this.currentPageId),
        }
      })

    return this
  }

  /**
   * Paste shapes (or text) from clipboard to a certain point.
   * @param point
   * @param string
   */
  paste = (point?: number[], string?: string): this => {
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

    const idsMap = Object.fromEntries(this.clipboard.map((shape) => [shape.id, Utils.uniqueId()]))

    const shapesToPaste = this.clipboard.map((shape) => ({
      ...shape,
      id: idsMap[shape.id],
      parentId: idsMap[shape.parentId] || this.currentPageId,
    }))

    const commonBounds = Utils.getCommonBounds(shapesToPaste.map(TLDR.getBounds))

    const centeredBounds = Utils.centerBounds(
      commonBounds,
      this.getPagePoint(point || [window.innerWidth / 2, window.innerHeight / 2])
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

  /**
   * Copy one or more shapes as SVG.
   * @param ids The ids of the shapes to copy.
   * @param pageId The page from which to copy the shapes.
   * @returns A string containing the JSON.
   */
  copySvg = (ids = this.selectedIds, pageId = this.currentPageId) => {
    if (ids.length === 0) return

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

    ids.forEach((id) => {
      const elm = document.getElementById(id)
      if (elm) {
        const clone = elm?.cloneNode(true)
        svg.appendChild(clone)
      }
    })

    const shapes = ids.map((id) => this.getShape(id, pageId))
    const bounds = Utils.getCommonBounds(shapes.map(TLDR.getBounds))
    const padding = 16

    // Resize the element to the bounding box
    svg.setAttribute(
      'viewBox',
      [
        bounds.minX - padding,
        bounds.minY - padding,
        bounds.width + padding * 2,
        bounds.height + padding * 2,
      ].join(' ')
    )

    svg.setAttribute('width', String(bounds.width))

    svg.setAttribute('height', String(bounds.height))

    const s = new XMLSerializer()

    const svgString = s
      .serializeToString(svg)
      .replaceAll('&#10;      ', '')
      .replaceAll(/((\s|")[0-9]*\.[0-9]{2})([0-9]*)(\b|"|\))/g, '$1')

    TLDR.copyStringToClipboard(svgString)

    return svgString
  }

  /**
   * Copy one or more shapes as JSON.
   * @param ids The ids of the shapes to copy.
   * @param pageId The page from which to copy the shapes.
   * @returns A string containing the JSON.
   */
  copyJson = (ids = this.selectedIds, pageId = this.currentPageId) => {
    const shapes = ids.map((id) => this.getShape(id, pageId))
    const json = JSON.stringify(shapes, null, 2)
    TLDR.copyStringToClipboard(json)
    return json
  }

  /* -------------------------------------------------- */
  /*                       Camera                       */
  /* -------------------------------------------------- */

  /**
   * Set the camera to a specific point and zoom.
   * @param point The camera point (top left of the viewport).
   * @param zoom The zoom level.
   * @param reason Why did the camera change?
   */
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

  /**
   * Reset the camera to the default position
   */
  resetCamera = (): this => {
    return this.setCamera(
      Vec.round([window.innerWidth / 2, window.innerHeight / 2]),
      1,
      `reset_camera`
    )
  }

  /**
   * Pan the camera
   * @param delta
   */
  pan = (delta: number[]): this => {
    const { camera } = this.pageState
    return this.setCamera(Vec.round(Vec.sub(camera.point, delta)), camera.zoom, `panned`)
  }

  /**
   * Pinch to a new zoom level, possibly together with a pan.
   * @param point The current point under the cursor.
   * @param delta The movement delta.
   * @param zoomDelta The zoom detal
   */
  pinchZoom = (point: number[], delta: number[], zoomDelta: number): this => {
    const { camera } = this.pageState
    const nextPoint = Vec.add(camera.point, Vec.div(delta, camera.zoom))
    const nextZoom = TLDR.getCameraZoom(camera.zoom - zoomDelta * camera.zoom)
    const p0 = Vec.sub(Vec.div(point, camera.zoom), nextPoint)
    const p1 = Vec.sub(Vec.div(point, nextZoom), nextPoint)
    return this.setCamera(Vec.round(Vec.add(nextPoint, Vec.sub(p1, p0))), nextZoom, `pinch_zoomed`)
  }

  /**
   * Zoom to a new zoom level, keeping the point under the cursor in the same position
   * @param next The new zoom level.
   * @param center The point to zoom towards (defaults to screen center).
   */
  zoomTo = (next: number, center = [window.innerWidth / 2, window.innerHeight / 2]): this => {
    const { zoom, point } = this.pageState.camera
    const p0 = Vec.sub(Vec.div(center, zoom), point)
    const p1 = Vec.sub(Vec.div(center, next), point)
    return this.setCamera(Vec.round(Vec.add(point, Vec.sub(p1, p0))), next, `zoomed_camera`)
  }

  /**
   * Zoom out by 25%
   */
  zoomIn = (): this => {
    const i = Math.round((this.pageState.camera.zoom * 100) / 25)
    const nextZoom = TLDR.getCameraZoom((i + 1) * 0.25)
    return this.zoomTo(nextZoom)
  }

  /**
   * Zoom in by 25%.
   */
  zoomOut = (): this => {
    const i = Math.round((this.pageState.camera.zoom * 100) / 25)
    const nextZoom = TLDR.getCameraZoom((i - 1) * 0.25)
    return this.zoomTo(nextZoom)
  }

  /**
   * Zoom to fit the page's shapes.
   */
  zoomToFit = (): this => {
    const shapes = this.getShapes()

    if (shapes.length === 0) return this

    const bounds = Utils.getCommonBounds(Object.values(shapes).map(TLDR.getBounds))

    const zoom = TLDR.getCameraZoom(
      window.innerWidth < window.innerHeight
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

  /**
   * Zoom to the selected shapes.
   */
  zoomToSelection = (): this => {
    if (this.selectedIds.length === 0) return this

    const bounds = TLDR.getSelectedBounds(this.state)

    const zoom = TLDR.getCameraZoom(
      window.innerWidth < window.innerHeight
        ? (window.innerWidth - 128) / bounds.width
        : (window.innerHeight - 128) / bounds.height
    )

    const mx = (window.innerWidth - bounds.width * zoom) / 2 / zoom
    const my = (window.innerHeight - bounds.height * zoom) / 2 / zoom

    return this.setCamera(
      Vec.round(Vec.add([-bounds.minX, -bounds.minY], [mx, my])),
      zoom,
      `zoomed_to_selection`
    )
  }

  /**
   * Zoom back to content when the canvas is empty.
   */
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

  /**
   * Zoom the camera to 100%.
   */
  zoomToActual = (): this => {
    return this.zoomTo(1)
  }

  /**
   * Zoom the camera by a certain delta.
   * @param delta The zoom delta.
   * @param center The point to zoom toward.
   */
  zoom = Utils.throttle((delta: number, center?: number[]): this => {
    const { zoom } = this.pageState.camera
    const nextZoom = TLDR.getCameraZoom(zoom - delta * zoom)
    return this.zoomTo(nextZoom, center)
  }, 16)

  /* -------------------------------------------------- */
  /*                      Selection                     */
  /* -------------------------------------------------- */

  /**
   * Clear the selection history (undo/redo stack for selection).
   */
  private clearSelectHistory = (): this => {
    this.selectHistory.pointer = 0
    this.selectHistory.stack = [this.selectedIds]
    return this
  }

  /**
   * Adds a selection to the selection history (undo/redo stack for selection).
   */
  private addToSelectHistory = (ids: string[]): this => {
    if (this.selectHistory.pointer < this.selectHistory.stack.length) {
      this.selectHistory.stack = this.selectHistory.stack.slice(0, this.selectHistory.pointer + 1)
    }
    this.selectHistory.pointer++
    this.selectHistory.stack.push(ids)
    return this
  }

  /**
   * Set the current selection.
   * @param ids The ids to select
   * @param push Whether to add the ids to the current selection instead.
   */
  private setSelectedIds = (ids: string[], push = false): this => {
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

  /**
   * Undo the most recent selection.
   */
  undoSelect = (): this => {
    if (this.selectHistory.pointer > 0) {
      this.selectHistory.pointer--
      this.setSelectedIds(this.selectHistory.stack[this.selectHistory.pointer])
    }
    return this
  }

  /**
   * Redo the previous selection.
   */
  redoSelect = (): this => {
    if (this.selectHistory.pointer < this.selectHistory.stack.length - 1) {
      this.selectHistory.pointer++
      this.setSelectedIds(this.selectHistory.stack[this.selectHistory.pointer])
    }
    return this
  }

  /**
   * Select one or more shapes.
   * @param ids The shape ids to select.
   */
  select = (...ids: string[]): this => {
    ids.forEach((id) => {
      if (!this.page.shapes[id]) {
        throw Error(`That shape does not exist on page ${this.currentPageId}`)
      }
    })
    this.setSelectedIds(ids)
    this.addToSelectHistory(ids)
    return this
  }

  /**
   * Select all shapes on the page.
   */
  selectAll = (): this => {
    if (this.session) return this
    this.setSelectedIds(Object.keys(this.page.shapes))
    this.addToSelectHistory(this.selectedIds)
    if (this.appState.activeTool !== 'select') {
      this.selectTool('select')
    }
    return this
  }

  /**
   * Deselect any selected shapes.
   */
  deselectAll = (): this => {
    this.setSelectedIds([])
    this.addToSelectHistory(this.selectedIds)
    return this
  }

  /* -------------------------------------------------- */
  /*                      Sessions                      */
  /* -------------------------------------------------- */

  /**
   * Start a new session.
   * @param session The new session
   * @param args arguments of the session's start method.
   */
  startSession = <T extends Session>(
    session: T,
    ...args: ParametersExceptFirst<T['start']>
  ): this => {
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

  /**
   * Update the current session.
   * @param args The arguments of the current session's update method.
   */
  updateSession = <T extends Session>(...args: ParametersExceptFirst<T['update']>): this => {
    const { session } = this
    if (!session) return this
    const patch = session.update(this.state, ...args)
    if (!patch) return this
    return this.patchState(patch, `session:update:${session.id}`)
  }

  /**
   * Cancel the current session.
   * @param args The arguments of the current session's cancel method.
   */
  cancelSession = <T extends Session>(...args: ParametersExceptFirst<T['cancel']>): this => {
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

  /**
   * Complete the current session.
   * @param args The arguments of the current session's complete method.
   */
  completeSession = <T extends Session>(...args: ParametersExceptFirst<T['complete']>): this => {
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
  /*                      Sessions                      */
  /* -------------------------------------------------- */

  /**
   * Start a brush session.
   * @param point
   */
  startBrushSession = (point: number[]): this => {
    return this.startSession(new Sessions.BrushSession(this.state, point))
  }

  /**
   * Update a brush session.
   * @param point
   * @param metaKey
   */
  updateBrushSession = (point: number[], metaKey = false): this => {
    return this.updateSession<Sessions.BrushSession>(point, metaKey)
  }

  /**
   * Start a translate session.
   * @param point
   */
  startTranslateSession = (point: number[]): this => {
    return this.startSession(new Sessions.TranslateSession(this.state, point))
  }

  /**
   * Update a translate session.
   * @param point
   * @param shiftKey
   * @param altKey
   */
  updateTranslateSession = (point: number[], shiftKey = false, altKey = false): this => {
    return this.updateSession<Sessions.TranslateSession>(point, shiftKey, altKey)
  }

  /**
   * Start a transform session
   * @param point
   * @param handle
   * @param commandId
   */
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

    const idsToTransform = selectedIds.flatMap((id) =>
      TLDR.getDocumentBranch(this.state, id, this.currentPageId)
    )

    if (idsToTransform.length === 1) {
      return this.startSession(
        new Sessions.TransformSingleSession(this.state, point, this.pointedBoundsHandle, commandId)
      )
    }

    return this.startSession(
      new Sessions.TransformSession(this.state, point, this.pointedBoundsHandle)
    )
  }

  /**
   * Update a transform session.
   */
  updateTransformSession = (point: number[], shiftKey = false, altKey = false): this => {
    return this.updateSession<Sessions.TransformSingleSession | Sessions.TransformSession>(
      point,
      shiftKey,
      altKey
    )
  }

  /**
   * Start a text session.
   * @param id
   */
  startTextSession = (id: string): this => {
    return this.startSession(new Sessions.TextSession(this.state, id))
  }

  /**
   * Update a text session.
   * @param text
   */
  updateTextSession = (text: string): this => {
    return this.updateSession<Sessions.TextSession>(text)
  }

  /**
   * Start a draw session.
   * @param id
   * @param point
   */
  startDrawSession = (id: string, point: number[]): this => {
    return this.startSession(new Sessions.DrawSession(this.state, id, point))
  }

  /**
   * Update a draw session.
   * @param point
   * @param pressure
   * @param shiftKey
   */
  updateDrawSession = (point: number[], pressure: number, shiftKey = false): this => {
    return this.updateSession<Sessions.DrawSession>(point, pressure, shiftKey)
  }

  /**
   * Start a handle session.
   * @param point
   * @param handleId
   * @param commandId
   */
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

  /**
   * Update a handle session.
   * @param point
   * @param shiftKey
   * @param altKey
   * @param metaKey
   */
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

  /* -------------------------------------------------- */
  /*                   Shape Functions                  */
  /* -------------------------------------------------- */

  /**
   * Manually create shapes on the page.
   * @param shapes An array of shape partials, containing the initial props for the shapes.
   * @command
   */
  createShapes = (
    ...shapes: ({ id: string; type: TLDrawShapeType } & Partial<TLDrawShape>)[]
  ): this => {
    if (shapes.length === 0) return this
    return this.create(
      ...shapes.map((shape) => {
        return TLDR.getShapeUtils(shape as TLDrawShape).create({
          ...shape,
          parentId: shape.parentId || this.currentPageId,
        })
      })
    )
  }

  /**
   * Manually update a set of shapes.
   * @param shapes An array of shape partials, containing the changes to be made to each shape.
   * @command
   */
  updateShapes = (...shapes: ({ id: string } & Partial<TLDrawShape>)[]): this => {
    if (shapes.length === 0) return this
    return this.setState(Commands.update(this.state, shapes), 'updated_shape')
  }

  /**
   * Create one or more shapes.
   * @param shapes An array of shapes.
   * @command
   */
  create = (...shapes: TLDrawShape[]): this => {
    if (shapes.length === 0) return this
    return this.setState(Commands.create(this.state, shapes))
  }

  /**
   * Delete one or more shapes.
   * @param ids The ids of the shapes to delete.
   * @command
   */
  delete = (ids = this.selectedIds): this => {
    if (ids.length === 0) return this
    return this.setState(Commands.deleteShapes(this.state, ids))
  }

  /**
   * Delete all shapes on the page.
   */
  clear = (): this => {
    this.selectAll()
    this.delete()
    return this
  }

  /**
   * Change the style for one or more shapes.
   * @param style A style partial to apply to the shapes.
   * @param ids The ids of the shapes to change (defaults to selection).
   */
  style = (style: Partial<ShapeStyles>, ids = this.selectedIds): this => {
    return this.setState(Commands.style(this.state, ids, style))
  }

  /**
   * Align one or more shapes.
   * @param direction Whether to align horizontally or vertically.
   * @param ids The ids of the shapes to change (defaults to selection).
   */
  align = (type: AlignType, ids = this.selectedIds): this => {
    if (ids.length < 2) return this
    return this.setState(Commands.align(this.state, ids, type))
  }

  /**
   * Distribute one or more shapes.
   * @param direction Whether to distribute horizontally or vertically..
   * @param ids The ids of the shapes to change (defaults to selection).
   */
  distribute = (direction: DistributeType, ids = this.selectedIds): this => {
    if (ids.length < 3) return this
    return this.setState(Commands.distribute(this.state, ids, direction))
  }

  /**
   * Stretch one or more shapes to their common bounds.
   * @param direction Whether to stretch horizontally or vertically.
   * @param ids The ids of the shapes to change (defaults to selection).
   */
  stretch = (direction: StretchType, ids = this.selectedIds): this => {
    if (ids.length < 2) return this
    return this.setState(Commands.stretch(this.state, ids, direction))
  }

  /**
   * Flip one or more shapes horizontally.
   * @param ids The ids of the shapes to change (defaults to selection).
   */
  flipHorizontal = (ids = this.selectedIds): this => {
    if (ids.length === 0) return this
    return this.setState(Commands.flip(this.state, ids, FlipType.Horizontal))
  }

  /**
   * Flip one or more shapes vertically.
   * @param ids The ids of the shapes to change (defaults to selection).
   */
  flipVertical = (ids = this.selectedIds): this => {
    if (ids.length === 0) return this
    return this.setState(Commands.flip(this.state, ids, FlipType.Vertical))
  }

  /**
   * Move one or more shapes to a new page. Will also break or move bindings.
   * @param toPageId The id of the page to move the shapes to.
   * @param fromPageId The id of the page to move the shapes from (defaults to current page).
   * @param ids The ids of the shapes to move (defaults to selection).
   */
  moveToPage = (
    toPageId: string,
    fromPageId = this.currentPageId,
    ids = this.selectedIds
  ): this => {
    if (ids.length === 0) return this
    this.setState(Commands.moveToPage(this.state, ids, fromPageId, toPageId))
    return this
  }

  /**
   * Move one or more shapes to the back of the page.
   * @param ids The ids of the shapes to change (defaults to selection).
   */
  moveToBack = (ids = this.selectedIds): this => {
    if (ids.length === 0) return this
    return this.setState(Commands.move(this.state, ids, MoveType.ToBack))
  }

  /**
   * Move one or more shapes backward on of the page.
   * @param ids The ids of the shapes to change (defaults to selection).
   */
  moveBackward = (ids = this.selectedIds): this => {
    if (ids.length === 0) return this
    return this.setState(Commands.move(this.state, ids, MoveType.Backward))
  }

  /**
   * Move one or more shapes forward on the page.
   * @param ids The ids of the shapes to change (defaults to selection).
   */
  moveForward = (ids = this.selectedIds): this => {
    if (ids.length === 0) return this
    return this.setState(Commands.move(this.state, ids, MoveType.Forward))
  }

  /**
   * Move one or more shapes to the front of the page.
   * @param ids The ids of the shapes to change (defaults to selection).
   */
  moveToFront = (ids = this.selectedIds): this => {
    if (ids.length === 0) return this
    return this.setState(Commands.move(this.state, ids, MoveType.ToFront))
  }

  /**
   * Nudge one or more shapes in a direction.
   * @param delta The direction to nudge the shapes.
   * @param isMajor Whether this is a major (i.e. shift) nudge.
   * @param ids The ids to change (defaults to selection).
   */
  nudge = (delta: number[], isMajor = false, ids = this.selectedIds): this => {
    if (ids.length === 0) return this
    return this.setState(Commands.translate(this.state, ids, Vec.mul(delta, isMajor ? 10 : 1)))
  }

  /**
   * Duplicate one or more shapes.
   * @param ids The ids to duplicate (defaults to selection).
   */
  duplicate = (ids = this.selectedIds): this => {
    if (ids.length === 0) return this
    return this.setState(Commands.duplicate(this.state, ids))
  }

  /**
   * Reset the bounds for one or more shapes. Usually when the
   * bounding box of a shape is double-clicked. Different shapes may
   * handle this differently.
   * @param ids The ids to change (defaults to selection).
   */
  resetBounds = (ids = this.selectedIds): this => {
    const command = Commands.resetBounds(this.state, ids, this.currentPageId)
    return this.setState(Commands.resetBounds(this.state, ids, this.currentPageId), command.id)
  }

  /**
   * Toggle the hidden property of one or more shapes.
   * @param ids The ids to change (defaults to selection).
   */
  toggleHidden = (ids = this.selectedIds): this => {
    if (ids.length === 0) return this
    return this.setState(Commands.toggle(this.state, ids, 'isHidden'))
  }

  /**
   * Toggle the locked property of one or more shapes.
   * @param ids The ids to change (defaults to selection).
   */
  toggleLocked = (ids = this.selectedIds): this => {
    if (ids.length === 0) return this
    return this.setState(Commands.toggle(this.state, ids, 'isLocked'))
  }

  /**
   * Toggle the fixed-aspect-ratio property of one or more shapes.
   * @param ids The ids to change (defaults to selection).
   */
  toggleAspectRatioLocked = (ids = this.selectedIds): this => {
    if (ids.length === 0) return this
    return this.setState(Commands.toggle(this.state, ids, 'isAspectRatioLocked'))
  }

  /**
   * Toggle the decoration at a handle of one or more shapes.
   * @param handleId The handle to toggle.
   * @param ids The ids of the shapes to toggle the decoration on.
   */
  toggleDecoration = (handleId: string, ids = this.selectedIds): this => {
    if (ids.length === 0 || !(handleId === 'start' || handleId === 'end')) return this
    return this.setState(Commands.toggleDecoration(this.state, ids, handleId))
  }

  /**
   * Rotate one or more shapes by a delta.
   * @param delta The delta in radians.
   * @param ids The ids to rotate (defaults to selection).
   */
  rotate = (delta = Math.PI * -0.5, ids = this.selectedIds): this => {
    if (ids.length === 0) return this
    return this.setState(Commands.rotate(this.state, ids, delta))
  }

  /**
   * Group the selected shapes.
   * @param ids The ids to group (defaults to selection).
   * @param groupId The new group's id.
   */
  group = (
    ids = this.selectedIds,
    groupId = Utils.uniqueId(),
    pageId = this.currentPageId
  ): this => {
    if (ids.length < 2) return this
    const command = Commands.group(this.state, ids, groupId, pageId)
    if (!command) return this
    return this.setState(command)
  }

  /**
   * Ungroup the selected groups.
   * @todo
   */
  ungroup = (groupId = this.selectedIds[0], pageId = this.currentPageId): this => {
    const shape = this.getShape(groupId, pageId)
    if (shape.type !== TLDrawShapeType.Group) return this

    const command = Commands.ungroup(this.state, groupId, pageId)
    if (!command) return this
    return this.setState(command)
  }

  /**
   * Cancel the current session.
   */
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
      case TLDrawStatus.Translating:
      case TLDrawStatus.Transforming:
      case TLDrawStatus.Rotating:
      case TLDrawStatus.Creating: {
        this.cancelSession()
        break
      }
    }

    return this
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
          case TLDrawToolType.Draw: {
            return this.updateDrawSession(
              this.getPagePoint(info.point),
              info.pressure,
              info.shiftKey
            )
          }
          case TLDrawToolType.Bounds: {
            return this.updateTransformSession(this.getPagePoint(info.point), info.shiftKey)
          }
          case TLDrawToolType.Handle: {
            return this.updateHandleSession(
              this.getPagePoint(info.point),
              info.shiftKey,
              info.altKey,
              info.metaKey
            )
          }
          case TLDrawToolType.Point: {
            break
          }
          case TLDrawToolType.Points: {
            break
          }
        }
        break
      }
    }

    return this
  }

  /**
   * Create a new shape based on the active tool.
   * @param point The point at which to create the shape
   * @param id (optional) The new shape's id.
   */
  createActiveToolShape = (point: number[], id = Utils.uniqueId()): this => {
    const pagePoint = Vec.round(this.getPagePoint(point))

    if (this.appState.activeTool === 'select') return this

    if (!this.appState.activeToolType) throw Error

    const utils = TLDR.getShapeUtils({ type: this.appState.activeTool } as TLDrawShape)

    const shapes = this.getShapes()

    const childIndex =
      shapes.length === 0
        ? 1
        : shapes
            .filter((shape) => shape.parentId === this.currentPageId)
            .sort((a, b) => b.childIndex - a.childIndex)[0].childIndex + 1

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
        return this.startTextSession(id)
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
          this.updateTranslateSession(this.getPagePoint(info.point), info.shiftKey, info.altKey)
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
    if (this.state.settings.isZoomSnap) {
      const i = Math.round((this.pageState.camera.zoom * 100) / 25)
      const nextZoom = TLDR.getCameraZoom(i * 0.25)
      this.zoomTo(nextZoom, inputs.pointer?.point)
    }
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

  /* ----------------- Pointer Events ----------------- */

  onPointerMove: TLPointerEventHandler = (info) => {
    // Several events (e.g. pan) can trigger the same "pointer move" behavior
    this.updateOnPointerMove(info)
  }

  onPointerDown: TLPointerEventHandler = (info) => {
    switch (this.appState.status.current) {
      case TLDrawStatus.Idle: {
        switch (this.appState.activeTool) {
          case TLDrawShapeType.Draw: {
            this.createActiveToolShape(info.point)
            break
          }
          case TLDrawShapeType.Rectangle: {
            this.createActiveToolShape(info.point)
            break
          }
          case TLDrawShapeType.Ellipse: {
            this.createActiveToolShape(info.point)
            break
          }
          case TLDrawShapeType.Arrow: {
            this.createActiveToolShape(info.point)
            break
          }
          case TLDrawShapeType.Text: {
            this.createActiveToolShape(info.point)
            break
          }
        }
        break
      }
      case TLDrawStatus.EditingText: {
        this.completeSession()
        break
      }
    }
  }

  onPointerUp: TLPointerEventHandler = (info) => {
    switch (this.appState.status.current) {
      case TLDrawStatus.PointingBounds: {
        if (info.target === 'bounds') {
          // If we just clicked the selecting bounds's background,
          // clear the selection
          this.deselectAll()
        } else if (this.selectedIds.includes(info.target)) {
          // If we're holding shift...
          if (info.shiftKey) {
            // unless we just shift-selected the shape, remove it from
            // the selected shapes
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
      case TLDrawStatus.Idle: {
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
    }
  }

  onDoubleClickCanvas: TLCanvasEventHandler = (info) => {
    // Unused
    switch (this.appState.status.current) {
      case TLDrawStatus.Idle: {
        switch (this.appState.activeTool) {
          case TLDrawShapeType.Text: {
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
    const { activeTool, status } = this.appState

    // While holding command and shift, select or deselect
    // the shape, ignoring any group that may contain it. Yikes!
    if (
      activeTool === 'select' &&
      (status.current === TLDrawStatus.Idle || status.current === TLDrawStatus.PointingBounds) &&
      info.metaKey &&
      info.shiftKey &&
      this.pageState.hoveredId
    ) {
      const targetId = this.pageState.hoveredId
      this.pointedId = targetId

      if (this.selectedIds.includes(targetId)) {
        // Deselect if selected
        this.select(...this.selectedIds.filter((id) => id !== targetId))
      } else {
        const shape = this.getShape(this.pageState.hoveredId)
        // Push select the shape, deselecting the shape's parent if selected
        this.select(...this.selectedIds.filter((id) => id !== shape.parentId), targetId)
      }

      return
    }

    switch (status.current) {
      case TLDrawStatus.Idle: {
        switch (activeTool) {
          case 'select': {
            if (info.metaKey) {
              if (!info.shiftKey) {
                this.deselectAll()
              }
              // While holding just command key, start a brush session
              this.startBrushSession(this.getPagePoint(info.point))
              return
            }

            // If we've clicked on a shape that is inside of a group,
            // then select the group rather than the shape.
            let shapeIdToSelect: string
            const { parentId } = this.getShape(info.target)

            // If the pointed shape is a child of the page, select the
            // target shape and clear the selected group id.
            if (parentId === this.currentPageId) {
              shapeIdToSelect = info.target
              this.selectedGroupId = undefined
            } else {
              // If the parent is some other group...
              if (parentId === this.selectedGroupId) {
                // If that group is the selected group, then select
                // the target shape.
                shapeIdToSelect = info.target
              } else {
                // Otherwise, select the group and clear the selected
                // group id.
                shapeIdToSelect = parentId
                this.selectedGroupId = undefined
              }
            }

            if (!this.selectedIds.includes(shapeIdToSelect)) {
              // Set the pointed ID to the shape that was clicked.
              this.pointedId = shapeIdToSelect

              // If the shape is not selected: then if the user is pressing shift,
              // add the shape to the current selection; otherwise, set the shape as
              // the only selected shape.
              this.select(
                ...(info.shiftKey ? [...this.selectedIds, shapeIdToSelect] : [shapeIdToSelect])
              )
            }

            this.setStatus(TLDrawStatus.PointingBounds)
            break
          }
        }
        break
      }
      case TLDrawStatus.PointingBounds: {
        const { parentId } = this.getShape(info.target)
        this.pointedId = parentId === this.currentPageId ? info.target : parentId

        break
      }
    }
  }

  onReleaseShape: TLPointerEventHandler = () => {
    // Unused
  }

  onDoubleClickShape: TLPointerEventHandler = (info) => {
    switch (this.appState.status.current) {
      case TLDrawStatus.Idle:
      case TLDrawStatus.PointingBounds: {
        switch (this.appState.activeTool) {
          case 'select': {
            const shape = this.getShape(info.target)
            if (shape.parentId !== this.currentPageId) {
              this.selectedGroupId = shape.parentId
            }
            if (this.selectedIds.includes(shape.id)) {
              if (shape.type === TLDrawShapeType.Text) {
                this.startTextSession(info.target)
              }
            }
            this.select(info.target)
            break
          }
        }
        break
      }
    }
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
  onPointBounds: TLBoundsEventHandler = (info) => {
    if (info.metaKey) {
      if (!info.shiftKey) {
        this.deselectAll()
      }
      // While holding just command key, start a brush session
      this.startBrushSession(this.getPagePoint(info.point))
      return
    }

    this.setStatus(TLDrawStatus.PointingBounds)
  }

  onDoubleClickBounds: TLBoundsEventHandler = () => {
    // Unused
  }

  onRightPointBounds: TLBoundsEventHandler = () => {
    // Unused
  }

  onDragBounds: TLBoundsEventHandler = () => {
    // Unused
  }

  onHoverBounds: TLBoundsEventHandler = () => {
    // Unused
  }

  onUnhoverBounds: TLBoundsEventHandler = () => {
    // Unused
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
    if (this.selectedIds.length === 1) {
      this.resetBounds(this.selectedIds)
    }
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
            isEmptyCanvas: true,
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
