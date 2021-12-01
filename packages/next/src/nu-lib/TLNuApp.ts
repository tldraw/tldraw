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
} from '~types'
import { TLNuHistory } from './TLNuHistory'

export interface TLNuSerializedApp {
  currentPageId: string
  selectedIds: string[]
  pages: TLNuSerializedPage[]
}

export class TLNuApp<S extends TLNuShape = TLNuShape, B extends TLNuBinding = TLNuBinding>
  implements Partial<TLNuCallbacks<S>>
{
  constructor(serializedApp?: TLNuSerializedApp, shapeClasses?: TLNuShapeClass<S>[]) {
    makeObservable(this)

    if (shapeClasses) {
      shapeClasses.forEach((c) => this.registerShape(c))
    }

    if (serializedApp) {
      this.history.deserialize(serializedApp)
    }

    this.notify('mount', null)
  }

  @observable inputs = new TLNuInputs()

  @observable viewport = new TLNuViewport()

  // Shapes

  // Map of shape classes (used for deserialization)
  shapes = new Map<string, TLNuShapeClass<S>>()

  registerShape = (shapeClass: TLNuShapeClass<S>) => {
    this.shapes.set(shapeClass.type, shapeClass)
  }

  deregisterShape = (shapeClass: TLNuShapeClass<S>) => {
    this.shapes.delete(shapeClass.type)
  }

  getShapeClass = (type: string): TLNuShapeClass<S> => {
    const shapeClass = this.shapes.get(type)
    if (!shapeClass) throw Error(`Could not find shape class for ${type}`)
    return shapeClass
  }

  // Tools

  readonly tools: TLNuTool<S, B>[] = [new TLNuSelectTool(this)]

  registerTool = (tool: TLNuTool<S, B>) => {
    this.tools.push(tool)
  }

  deregisterTool = (tool: TLNuTool<S, B>) => {
    this.tools.splice(this.tools.indexOf(tool), 1)
  }

  @observable selectedTool: TLNuTool<S, B> = this.tools[0]

  @action readonly selectTool = (id: string, data: Record<string, unknown> = {}): this => {
    const nextTool = this.tools.find((tool) => tool.id === id)
    if (!nextTool) throw Error(`Could not find a tool named ${id}.`)
    const currentToolId = this.selectedTool.id
    this.selectedTool.onExit?.({ ...data, toId: nextTool.id })
    this.selectedTool = nextTool
    this.selectedTool.onEnter?.({ ...data, fromId: currentToolId })
    this.isToolLocked = false
    return this
  }

  @observable isToolLocked = false

  @action setToolLock(value: boolean) {
    this.isToolLocked = value
  }

  protected registerToolShortcuts = (): this => {
    this.tools.forEach((tool) => {
      if (tool.shortcut !== undefined) {
        KeyUtils.registerShortcut(tool.shortcut, () => this.selectTool(tool.id))
      }
    })
    return this
  }

  // Pages

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

  // Current Page

  @observable currentPageId = 'page'

  @action setCurrentPageId(id: string) {
    this.currentPageId = id
  }

  @computed get currentPage(): TLNuPage<S, B> {
    const page = this.pages.find((page) => page.id === this.currentPageId)
    if (!page) throw Error(`Could not find a page named ${this.currentPageId}.`)
    return page
  }

  // Hovered Shape

  @observable hoveredId?: string

  @computed get hoveredShape(): S | undefined {
    const { hoveredId, currentPage } = this
    return hoveredId ? currentPage.shapes.find((shape) => shape.id === hoveredId) : undefined
  }

  @action readonly hover = (id: string | undefined): this => {
    this.hoveredId = id
    return this
  }

  // Selected Shapes

  @observable selectedIds: string[] = []

  @computed get selectedShapes(): S[] {
    return this.currentPage.shapes.filter((shape) => this.selectedIds.includes(shape.id))
  }

  @computed get selectedBounds(): TLNuBounds | undefined {
    return this.selectedShapes.length === 1
      ? { ...this.selectedShapes[0].bounds, rotation: this.selectedShapes[0].rotation }
      : BoundsUtils.getCommonBounds(this.selectedShapes.map((shape) => shape.rotatedBounds))
  }

  @action readonly select = (...shapes: S[] | string[]): this => {
    if (shapes[0] && typeof shapes[0] === 'string') {
      this.selectedIds = shapes as string[]
    } else {
      this.selectedIds = (shapes as S[]).map((shape) => shape.id)
    }
    return this
  }

  @action readonly deselect = (...ids: string[]): this => {
    this.selectedIds = this.selectedIds.filter((id) => !ids.includes(id))
    return this
  }

  @action readonly deselectAll = (): this => {
    this.selectedIds.length = 0
    return this
  }

  @action readonly selectAll = (): this => {
    this.selectedIds = this.currentPage.shapes.map((shape) => shape.id)
    return this
  }

  @action readonly delete = (...shapes: S[] | string[]): this => {
    this.currentPage.removeShapes(...shapes)
    return this
  }

  // Brush

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

  readonly getPagePoint = (point: number[]): number[] => {
    const { camera } = this.viewport
    return Vec.sub(Vec.div(point, camera.zoom), camera.point)
  }

  readonly getScreenPoint = (point: number[]): number[] => {
    const { camera } = this.viewport
    return Vec.mul(Vec.add(point, camera.point), camera.zoom)
  }

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

  // History

  history = new TLNuHistory<S, B>(this)

  persist = this.history.persist

  undo = this.history.undo

  redo = this.history.redo

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

  readonly onPan: TLNuWheelHandler<S> = (info, e) => {
    this.selectedTool._onPan?.(info, e)
    this.notify('persist', null)
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

  @computed get serialized(): TLNuSerializedApp {
    return {
      currentPageId: this.currentPageId,
      selectedIds: this.selectedIds,
      pages: this.pages.map((page) => page.serialized),
    }
  }
}
