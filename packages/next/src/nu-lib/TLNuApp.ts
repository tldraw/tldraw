/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Vec } from '@tldraw/vec'
import { action, computed, makeObservable, observable } from 'mobx'
import { BoundsUtils } from '~utils'
import {
  TLNuSelectTool,
  TLNuInputs,
  TLNuPage,
  TLNuViewport,
  TLNuShape,
  TLNuSerializedPage,
  TLNuShapeClass,
  TLNuSerializedShape,
  TLNuToolClass,
} from '../index'
import type {
  TLNuBounds,
  TLNuKeyboardHandler,
  TLNuPointerHandler,
  TLNuSubscription,
  TLNuWheelHandler,
  TLNuSubscriptionEventInfo,
  TLNuSubscriptionEventName,
  TLNuSubscriptionCallback,
  TLSubscribe,
  TLNuPinchHandler,
  TLNuPointerEvent,
  TLNuOnTransition,
} from '~types'
import { TLNuHistory } from './TLNuHistory'
import { TLNuSettings } from './TLNuSettings'
import { TLNuRootState } from './TLNuState'

export interface TLNuSerializedApp {
  currentPageId: string
  selectedIds: string[]
  pages: TLNuSerializedPage[]
}

export class TLNuApp<S extends TLNuShape = TLNuShape> extends TLNuRootState {
  constructor(
    serializedApp?: TLNuSerializedApp,
    shapeClasses?: TLNuShapeClass<S>[],
    tools?: TLNuToolClass[]
  ) {
    super()

    if (this.states && this.states.length > 0) {
      this.registerStates(...this.states)
      const initialId = this.initial ?? this.states[0].id
      const state = this.children.get(initialId)
      if (state) {
        this.currentState = state
        this.currentState?._events.onEnter({ fromId: 'initial' })
      }
    }

    this.registerKeyboardShortcuts()

    if (shapeClasses) this.registerShapes(...shapeClasses)
    if (tools) this.registerStates(...tools)
    if (serializedApp) this.history.deserialize(serializedApp)

    makeObservable(this)

    this.notify('mount', null)
  }

  static id = 'app'

  static states: TLNuToolClass[] = [TLNuSelectTool]

  static initial = 'select'

  inputs = new TLNuInputs()

  viewport = new TLNuViewport()

  settings = new TLNuSettings()

  get selectedTool() {
    return this.currentState
  }

  selectTool = this.transition
  registerTools = this.registerStates

  /* --------------------- History -------------------- */

  // this needs to be at the bottom

  history = new TLNuHistory<S>(this)

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

  @computed get showBounds() {
    return this.selectedShapes.length > 0 && !this.selectedShapes.every((shape) => shape.hideBounds)
  }

  @computed get showBoundsDetail() {
    return (
      this.selectedShapes.length > 0 &&
      !this.selectedShapes.every((shape) => shape.hideBoundsDetail)
    )
  }

  @computed get showBoundsRotation() {
    const stateId = this.selectedTool.currentState.id
    return (
      (this.selectedShapes.length > 0 && stateId === 'rotatingShapes') ||
      stateId === 'pointingRotateHandle'
    )
  }

  @computed get showContextBar() {
    const stateId = this.selectedTool.currentState.id
    return (
      this.selectedShapes.length > 0 &&
      stateId === 'idle' &&
      !this.selectedShapes.every((shape) => shape.hideContextBar)
    )
  }

  @computed get showRotateHandle() {
    const stateId = this.selectedTool.currentState.id
    return (
      this.selectedShapes.length > 0 &&
      stateId === 'idle' &&
      !this.selectedShapes.every((shape) => shape.hideRotateHandle)
    )
  }

  @computed get showResizeHandles() {
    const stateId = this.selectedTool.currentState.id
    return (
      this.selectedShapes.length > 0 &&
      stateId === 'idle' &&
      !this.selectedShapes.every((shape) => shape.hideResizeHandles)
    )
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
    if (!type) throw Error('No shape type provided.')
    const shapeClass = this.shapeClasses.get(type)
    if (!shapeClass) throw Error(`Could not find shape class for ${type}`)
    return shapeClass
  }

  /* -------------------- Settings -------------------- */

  @observable isToolLocked = false

  @action setToolLock(value: boolean) {
    this.isToolLocked = value
  }

  /* ---------------------- Pages --------------------- */

  @observable pages: TLNuPage<S>[] = [
    new TLNuPage(this, { id: 'page', name: 'page', shapes: [], bindings: [] }),
  ]

  @action addPages(...pages: TLNuPage<S>[]): void {
    this.pages.push(...pages)
    this.persist()
  }

  @action removePages(...pages: TLNuPage<S>[]): void {
    this.pages = this.pages.filter((page) => !pages.includes(page))
    this.persist()
  }

  /* ------------------ Current Page ------------------ */

  @observable currentPageId = 'page'

  @action setCurrentPage(page: string | TLNuPage<S>) {
    this.currentPageId = typeof page === 'string' ? page : page.id
    return this
  }

  @computed get currentPage(): TLNuPage<S> {
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
    if (shapes.length === 0) return this

    let ids: Set<string>
    if (typeof shapes[0] === 'string') {
      ids = new Set(shapes as string[])
    } else {
      ids = new Set((shapes as S[]).map((shape) => shape.id))
    }
    this.selectedIds = this.selectedIds.filter((id) => !ids.has(id))
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

  private subscriptions = new Set<TLNuSubscription<S, this, TLNuSubscriptionEventName>>([])

  readonly unsubscribe = (subscription: TLNuSubscription<S, this, TLNuSubscriptionEventName>) => {
    this.subscriptions.delete(subscription)
    return this
  }

  subscribe = <E extends TLNuSubscriptionEventName>(
    event: E | TLNuSubscription<S>,
    callback?: TLNuSubscriptionCallback<S, this, E>
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

  readonly onWheel: TLNuWheelHandler = (info, gesture, e) => {
    this.viewport.panCamera(gesture.delta)
    this.inputs.onWheel([...this.viewport.getPagePoint([e.clientX, e.clientY]), 0.5], e)
  }

  readonly onPointerDown: TLNuPointerHandler = (info, e) => {
    if ('clientX' in e) {
      this.inputs.onPointerDown(
        [...this.viewport.getPagePoint([e.clientX, e.clientY]), 0.5],
        e as TLNuPointerEvent<Element>
      )
    }
  }

  readonly onPointerUp: TLNuPointerHandler = (info, e) => {
    if ('clientX' in e) {
      this.inputs.onPointerUp(
        [...this.viewport.getPagePoint([e.clientX, e.clientY]), 0.5],
        e as TLNuPointerEvent<Element>
      )
    }
  }

  readonly onPointerMove: TLNuPointerHandler = (info, e) => {
    if ('clientX' in e) {
      this.inputs.onPointerMove([...this.viewport.getPagePoint([e.clientX, e.clientY]), 0.5], e)
    }
  }

  readonly onKeyDown: TLNuKeyboardHandler = (info, e) => {
    this.inputs.onKeyDown(e)
  }

  readonly onKeyUp: TLNuKeyboardHandler = (info, e) => {
    this.inputs.onKeyUp(e)
  }

  readonly onPinchStart: TLNuPinchHandler = (info, gesture, e) => {
    this.inputs.onPinchStart([...this.viewport.getPagePoint(gesture.origin), 0.5], e)
  }

  readonly onPinch: TLNuPinchHandler = (info, gesture, e) => {
    this.inputs.onPinch([...this.viewport.getPagePoint(gesture.origin), 0.5], e)
  }

  readonly onPinchEnd: TLNuPinchHandler = (info, gesture, e) => {
    this.inputs.onPinchEnd([...this.viewport.getPagePoint(gesture.origin), 0.5], e)
  }

  readonly onTransition: TLNuOnTransition<any> = () => {
    this.setToolLock(false)
  }

  /* ------------------- Public API ------------------- */

  /**
   * Set the current page.
   *
   * @param page The new current page or page id.
   */
  changePage = (page: string | TLNuPage<S>): this => {
    return this.setCurrentPage(page)
  }

  /**
   * Set the hovered shape.
   *
   * @param shape The new hovered shape or shape id.
   */
  hover = (shape: string | S | undefined): this => {
    return this.setHoveredShape(shape)
  }

  /**
   * Create one or more shapes on the current page.
   *
   * @param shapes The new shape instances or serialized shapes.
   */
  create = (...shapes: S[] | TLNuSerializedShape[]): this => {
    return this.createShapes(shapes)
  }

  /**
   * Update one or more shapes on the current page.
   *
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
   *
   * @param shapes The shapes or shape ids to delete.
   */
  delete = (...shapes: S[] | string[]): this => {
    if (shapes.length === 0) shapes = this.selectedIds
    if (shapes.length === 0) shapes = this.currentPage.shapes
    return this.deleteShapes(shapes)
  }

  /**
   * Select one or more shapes on the current page.
   *
   * @param shapes The shapes or shape ids to select.
   */
  select = (...shapes: S[] | string[]): this => {
    return this.setSelectedShapes(shapes)
  }

  /**
   * Deselect one or more selected shapes on the current page.
   *
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

  /** Select all shapes on the current page. */
  selectAll = (): this => {
    return this.setSelectedShapes(this.currentPage.shapes)
  }

  /** Deselect all shapes on the current page. */
  deselectAll = (): this => {
    return this.setSelectedShapes([])
  }

  /** Zoom the camera in. */
  zoomIn = (): this => {
    this.viewport.zoomIn()
    return this
  }

  /** Zoom the camera out. */
  zoomOut = (): this => {
    this.viewport.zoomOut()
    return this
  }

  /** Reset the camera to 100%. */
  resetZoom = (): this => {
    this.viewport.resetZoom()
    return this
  }

  /** Zoom to fit all of the current page's shapes in the viewport. */
  zoomToFit = (): this => {
    const { shapes } = this.currentPage
    if (shapes.length === 0) return this
    const commonBounds = BoundsUtils.getCommonBounds(shapes.map((shape) => shape.bounds))
    this.viewport.zoomToBounds(commonBounds)
    return this
  }

  /** Zoom to fit the current selection in the viewport. */
  zoomToSelection = (): this => {
    const { selectedBounds } = this
    if (!selectedBounds) return this
    this.viewport.zoomToBounds(selectedBounds)
    return this
  }
}
