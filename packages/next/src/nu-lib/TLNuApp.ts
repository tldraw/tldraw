/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Vec } from '@tldraw/vec'
import { action, computed, makeObservable, observable } from 'mobx'
import { BoundsUtils, KeyUtils } from '~utils'
import {
  TLNuSelectTool,
  TLNuInputs,
  TLNuPage,
  TLNuViewport,
  TLNuShape,
  TLNuTool,
  TLNuSerializedPage,
  TLNuShapeClass,
  TLNuToolClass,
  TLNuSerializedShape,
} from '~nu-lib'
import type {
  TLNuBinding,
  TLNuBounds,
  TLNuCallbacks,
  TLNuKeyboardHandler,
  TLNuPointerHandler,
  TLNuSubscription,
  TLNuWheelHandler,
  TLNuSubscriptionEventInfo,
  TLNuSubscriptionEventName,
  TLNuSubscriptionCallback,
  TLSubscribe,
  TLNuPinchHandler,
} from '~types'
import { TLNuHistory } from './TLNuHistory'
import { TLNuSettings } from './TLNuSettings'

export interface TLNuSerializedApp {
  currentPageId: string
  selectedIds: string[]
  pages: TLNuSerializedPage[]
}

export class TLNuApp<S extends TLNuShape = TLNuShape, B extends TLNuBinding = TLNuBinding>
  implements Partial<TLNuCallbacks<S>>
{
  constructor(
    serializedApp?: TLNuSerializedApp,
    shapeClasses?: TLNuShapeClass<S>[],
    toolClasses?: TLNuToolClass<S, B>[]
  ) {
    this.registerTools(TLNuSelectTool)
    this.selectedTool = this.toolClasses.get('select')!

    if (shapeClasses) this.registerShapes(...shapeClasses)
    if (toolClasses) this.registerTools(...toolClasses)
    if (serializedApp) this.history.deserialize(serializedApp)

    makeObservable(this)

    this.notify('mount', null)
  }

  inputs = new TLNuInputs()

  viewport = new TLNuViewport()

  settings = new TLNuSettings()

  /* -------------------- Disposal -------------------- */

  dispose = () => this.toolClasses.forEach((tool) => tool.dispose())

  /* --------------------- History -------------------- */

  // this needs to be at the bottom

  history = new TLNuHistory<S, B>(this)

  persist = this.history.persist

  undo = this.history.undo

  redo = this.history.redo

  /* -------------------- App State ------------------- */

  loadAppState(state: TLNuSerializedApp) {
    this.history.deserialize(state)
  }

  @computed get serialized(): TLNuSerializedApp {
    return {
      currentPageId: this.currentPageId,
      selectedIds: this.selectedIds,
      pages: this.pages.map((page) => page.serialized),
    }
  }

  /* ------------------ Shape Classes ----------------- */

  // Map of shape classes (used for deserialization)
  shapeClasses = new Map<string, TLNuShapeClass<S>>()

  registerShapes = (...shapeClasses: TLNuShapeClass<S>[]) => {
    shapeClasses.forEach((shapeClass) => this.shapeClasses.set(shapeClass.id, shapeClass))
  }

  deregisterShapes = (...shapeClasses: TLNuShapeClass<S>[]) => {
    shapeClasses.forEach((shapeClass) => this.shapeClasses.delete(shapeClass.id))
  }

  getShapeClass = (type: string): TLNuShapeClass<S> => {
    const shapeClass = this.shapeClasses.get(type)
    if (!shapeClass) throw Error(`Could not find shape class for ${type}`)
    return shapeClass
  }

  /* ------------------ Tool Classse ------------------ */

  readonly toolClasses: Map<string, TLNuTool<S, B>> = new Map()

  registerTools = (...tools: TLNuToolClass<any, B>[]) => {
    tools.forEach((Tool) => {
      const tool = new Tool(this)
      this.toolClasses.set(Tool.id, new Tool(this))

      // Register the tool's activation keyboard shortcut, if any
      if (Tool.shortcut !== undefined) {
        KeyUtils.registerShortcut(Tool.shortcut, () => this.selectTool(Tool.id))
      }

      // Register the tool's keyboard shortcuts, if any
      if (Tool.shortcuts?.length) {
        Tool.shortcuts.forEach(({ keys, fn }) =>
          tool.disposables.push(
            KeyUtils.registerShortcut(keys, () => {
              if (this.selectedTool.toolId === Tool.id) fn()
            })
          )
        )
      }
    })
  }

  deregisterTools = (...tools: TLNuToolClass<S, B>[]) => {
    tools.forEach((Tool) => {
      this.toolClasses.get(Tool.id)?.dispose()
      this.toolClasses.delete(Tool.id)
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  @observable selectedTool: TLNuTool<S, B>

  @action readonly selectTool = (id: string, data: Record<string, unknown> = {}): this => {
    const nextTool = this.toolClasses.get(id)
    if (!nextTool) throw Error(`Could not find a tool named ${id}.`)
    const currentToolType = this.selectedTool.toolId
    this.selectedTool.onExit?.({ ...data, toId: nextTool.toolId })
    this.selectedTool = nextTool
    this.selectedTool.onEnter?.({ ...data, fromId: currentToolType })
    this.isToolLocked = false
    return this
  }

  @observable isToolLocked = false

  @action setToolLock(value: boolean) {
    this.isToolLocked = value
  }

  /* ---------------------- Pages --------------------- */

  @observable pages: TLNuPage<S, B>[] = [
    new TLNuPage<S, B>(this, { id: 'page', name: 'page', shapes: [], bindings: [] }),
  ]

  @action addPages(...pages: TLNuPage<S, B>[]): void {
    this.pages.push(...pages)
    this.persist()
  }

  @action removePages(...pages: TLNuPage<S, B>[]): void {
    this.pages = this.pages.filter((page) => !pages.includes(page))
    this.persist()
  }

  /* ------------------ Current Page ------------------ */

  @observable currentPageId = 'page'

  @action setCurrentPage(page: string | TLNuPage<S, B>) {
    this.currentPageId = typeof page === 'string' ? page : page.id
    return this
  }

  @computed get currentPage(): TLNuPage<S, B> {
    const page = this.pages.find((page) => page.id === this.currentPageId)
    if (!page) throw Error(`Could not find a page named ${this.currentPageId}.`)
    return page
  }

  /* --------------------- Shapes --------------------- */

  @computed get shapesInViewport(): S[] {
    const {
      currentPage,
      viewport: { currentView },
    } = this

    return currentPage.shapes.filter(
      (shape) =>
        shape.parentId === currentPage.id &&
        (BoundsUtils.boundsContain(currentView, shape.rotatedBounds) ||
          BoundsUtils.boundsCollide(currentView, shape.rotatedBounds))
    )
  }

  @action readonly createShapes = (shapes: S[] | TLNuSerializedShape[]): this => {
    this.currentPage.addShapes(...shapes)
    return this
  }

  @action readonly deleteShapes = (shapes: S[] | string[]): this => {
    this.currentPage.removeShapes(...shapes)
    return this
  }

  /* ------------------ Hovered Shape ----------------- */

  @observable hoveredId?: string

  @computed get hoveredShape(): S | undefined {
    const { hoveredId, currentPage } = this
    return hoveredId ? currentPage.shapes.find((shape) => shape.id === hoveredId) : undefined
  }

  @action readonly setHoveredShape = (shape: string | S | undefined): this => {
    this.hoveredId = typeof shape === 'string' ? shape : shape?.id
    return this
  }

  /* ----------------- Selected Shapes ---------------- */

  @observable selectedIds: string[] = []

  @computed get selectedShapes(): S[] {
    return this.currentPage.shapes.filter((shape) => this.selectedIds.includes(shape.id))
  }

  @computed get selectedBounds(): TLNuBounds | undefined {
    return this.selectedShapes.length === 1
      ? { ...this.selectedShapes[0].bounds, rotation: this.selectedShapes[0].rotation }
      : BoundsUtils.getCommonBounds(this.selectedShapes.map((shape) => shape.rotatedBounds))
  }

  @action readonly setSelectedShapes = (shapes: S[] | string[]): this => {
    if (shapes[0] && typeof shapes[0] === 'string') {
      this.selectedIds = shapes as string[]
    } else {
      this.selectedIds = (shapes as S[]).map((shape) => shape.id)
    }
    return this
  }

  /* ---------------------- Brush --------------------- */

  @observable brush?: TLNuBounds

  @action readonly setBrush = (brush: TLNuBounds): this => {
    this.brush = brush
    return this
  }

  @action readonly clearBrush = (): this => {
    this.brush = undefined
    return this
  }

  // Camera

  @action setCamera = (point?: number[], zoom?: number): this => {
    this.viewport.update({ point, zoom })
    return this
  }

  readonly getPagePoint = (point: number[]): number[] => {
    const { camera } = this.viewport
    return Vec.sub(Vec.div(point, camera.zoom), camera.point)
  }

  readonly getScreenPoint = (point: number[]): number[] => {
    const { camera } = this.viewport
    return Vec.mul(Vec.add(point, camera.point), camera.zoom)
  }

  /* --------------------- Events --------------------- */

  private subscriptions = new Set<TLNuSubscription<TLNuSubscriptionEventName, S, B>>([])

  readonly unsubscribe = (subscription: TLNuSubscription<TLNuSubscriptionEventName, S, B>) => {
    this.subscriptions.delete(subscription)
    return this
  }

  subscribe: TLSubscribe = <E extends TLNuSubscriptionEventName>(
    event: E,
    callback?: TLNuSubscriptionCallback<E, S, B>
  ) => {
    if (typeof event === 'object') {
      this.subscriptions.add(event)
      return () => this.unsubscribe(event)
    } else {
      if (callback === undefined) throw Error('Callback is required.')
      const subscription = { event, callback }
      this.subscriptions.add(subscription)
      return () => this.unsubscribe(subscription)
    }
  }

  notify = <E extends TLNuSubscriptionEventName>(event: E, info: TLNuSubscriptionEventInfo<E>) => {
    this.subscriptions.forEach((subscription) => {
      if (subscription.event === event) {
        subscription.callback(this, info)
      }
    })
    return this
  }

  /* ----------------- Event Handlers ----------------- */

  readonly onWheel: TLNuWheelHandler<S> = (info, gesture, e) => {
    this.viewport.panCamera(gesture.delta)
    this.selectedTool._onWheel?.(info, gesture, e)
  }

  readonly onPointerDown: TLNuPointerHandler<S> = (info, e) => {
    this.selectedTool._onPointerDown?.(info, e)
  }

  readonly onPointerUp: TLNuPointerHandler<S> = (info, e) => {
    this.selectedTool._onPointerUp?.(info, e)
  }

  readonly onPointerMove: TLNuPointerHandler<S> = (info, e) => {
    this.selectedTool._onPointerMove?.(info, e)
  }

  readonly onPointerEnter: TLNuPointerHandler<S> = (info, e) => {
    this.selectedTool._onPointerEnter?.(info, e)
  }

  readonly onPointerLeave: TLNuPointerHandler<S> = (info, e) => {
    this.selectedTool._onPointerLeave?.(info, e)
  }

  readonly onKeyDown: TLNuKeyboardHandler<S> = (info, e) => {
    this.selectedTool._onKeyDown?.(info, e)
  }

  readonly onKeyUp: TLNuKeyboardHandler<S> = (info, e) => {
    this.selectedTool._onKeyUp?.(info, e)
  }

  readonly onPinchStart: TLNuPinchHandler<S> = (info, gesture, e) => {
    this.selectedTool._onPinchStart?.(info, gesture, e)
  }

  readonly onPinch: TLNuPinchHandler<S> = (info, gesture, e) => {
    this.selectedTool._onPinch?.(info, gesture, e)
  }

  readonly onPinchEnd: TLNuPinchHandler<S> = (info, gesture, e) => {
    this.selectedTool._onPinchEnd?.(info, gesture, e)
  }

  /* ------------------- Public API ------------------- */

  /**
   * Set the current page.
   * @param page The new current page or page id.
   */
  changePage = (page: string | TLNuPage<S, B>): this => {
    return this.setCurrentPage(page)
  }

  /**
   * Set the hovered shape.
   * @param shape The new hovered shape or shape id.
   */
  hover = (shape: string | S | undefined): this => {
    return this.setHoveredShape(shape)
  }

  /**
   * Create one or more shapes on the current page.
   * @param shapes The new shape instances or serialized shapes.
   */
  create = (...shapes: S[] | TLNuSerializedShape[]): this => {
    return this.createShapes(shapes)
  }

  /**
   * Update one or more shapes on the current page.
   * @param shapes The serialized shape changes to apply.
   */
  update = (...shapes: { id: string } & TLNuSerializedShape[]): this => {
    shapes.forEach((shape) => {
      this.currentPage.shapes.find((instance) => shape.id === instance.id)?.update(shape)
    })
    return this
  }

  /**
   * Delete one or more shapes from the current page.
   * @param shapes The shapes or shape ids to delete.
   */
  delete = (...shapes: S[] | string[]): this => {
    if (shapes.length === 0) shapes = this.selectedIds
    if (shapes.length === 0) shapes = this.currentPage.shapes
    return this.deleteShapes(shapes)
  }

  /**
   * Select one or more shapes on the current page.
   * @param shapes The shapes or shape ids to select.
   */
  select = (...shapes: S[] | string[]): this => {
    return this.setSelectedShapes(shapes)
  }

  /**
   * Deselect one or more selected shapes on the current page.
   * @param ids The shapes or shape ids to deselect.
   */
  deselect = (...shapes: S[] | string[]): this => {
    const ids =
      typeof shapes[0] === 'string'
        ? (shapes as string[])
        : (shapes as S[]).map((shape) => shape.id)
    this.setSelectedShapes(this.selectedIds.filter((id) => !ids.includes(id)))
    return this
  }

  /**
   * Select all shapes on the current page.
   */
  selectAll = (): this => {
    return this.setSelectedShapes(this.currentPage.shapes)
  }

  /**
   * Deselect all shapes on the current page.
   */
  deselectAll = (): this => {
    return this.setSelectedShapes([])
  }

  /**
   * Zoom the camera in.
   */
  zoomIn = (): this => {
    this.viewport.zoomIn()
    return this
  }

  /**
   * Zoom the camera out.
   */
  zoomOut = (): this => {
    this.viewport.zoomOut()
    return this
  }

  /**
   * Reset the camera to 100%.
   */
  resetZoom = (): this => {
    this.viewport.resetZoom()
    return this
  }

  /**
   * Zoom to fit all of the current page's shapes in the viewport.
   */
  zoomToFit = (): this => {
    const { shapes } = this.currentPage
    if (shapes.length === 0) return this
    const commonBounds = BoundsUtils.getCommonBounds(shapes.map((shape) => shape.bounds))
    this.viewport.zoomToBounds(commonBounds)
    return this
  }

  /**
   * Zoom to fit the current selection in the viewport.
   */
  zoomToSelection = (): this => {
    const { selectedBounds } = this
    if (!selectedBounds) return this
    this.viewport.zoomToBounds(selectedBounds)
    return this
  }
}
