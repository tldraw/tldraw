/* eslint-disable @typescript-eslint/no-explicit-any */
import { Vec } from '@tldraw/vec'
import { action, computed, makeObservable, observable } from 'mobx'
import { BoundsUtils, KeyUtils } from '~utils'
import { TLNuSelectTool, TLNuInputs, TLNuPage, TLNuViewport, TLNuShape, TLNuTool } from '~nu-lib'
import type {
  TLNuBinding,
  TLNuBounds,
  TLNuCallbacks,
  TLNuKeyboardHandler,
  TLNuPointerHandler,
  TLNuWheelHandler,
} from '~types'
import { TLNuHistory } from './TLNuHistory'

export enum TLNuStatus {
  Idle = 'idle',
  PointingCanvas = 'pointingCanvas',
  Brushing = 'brushing',
  PointingShape = 'pointingShape',
  TranslatingShapes = 'translatingShapes',
  PointingBounds = 'pointingBounds',
}

export abstract class TLNuApp<S extends TLNuShape = TLNuShape, B extends TLNuBinding = TLNuBinding>
  implements Partial<TLNuCallbacks<S>>
{
  constructor() {
    makeObservable(this)
  }

  // Map of shape classes (used for deserialization)
  shapes: Record<string, { new (props: any): S }> = {}

  @observable inputs = new TLNuInputs()

  @observable viewport = new TLNuViewport()

  history = new TLNuHistory<S, B>(this)

  // Tools

  readonly tools: TLNuTool<S, B>[] = [new TLNuSelectTool(this)]

  @observable selectedTool: TLNuTool<S, B> = this.tools[0]

  @action readonly selectTool = (id: string, data: Record<string, unknown> = {}): this => {
    const nextTool = this.tools.find((tool) => tool.id === id)
    if (!nextTool) throw Error(`Could not find a tool named ${id}.`)
    const currentToolId = this.selectedTool.id
    this.selectedTool.onExit?.({ ...data, toId: nextTool.id })
    this.selectedTool = nextTool
    this.selectedTool.onEnter?.({ ...data, fromId: currentToolId })
    return this
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

  getPagesMap() {
    return new Map(this.pages.map((page) => [page.id, page]))
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
    const { hoveredId, currentPage, selectedTool } = this
    if (!(hoveredId && selectedTool.id === 'select' && selectedTool.currentState.id === 'idle')) {
      return
    }

    return currentPage.shapes.find((shape) => shape.id === hoveredId)
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

  @action readonly select = (...ids: string[]): this => {
    this.selectedIds = ids
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

  persist = this.history.persist

  undo = this.history.undo

  redo = this.history.redo

  /* --------------------- Events --------------------- */

  readonly onPan: TLNuWheelHandler<S> = (info, e) => {
    this.selectedTool._onPan?.(info, e)
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
}
