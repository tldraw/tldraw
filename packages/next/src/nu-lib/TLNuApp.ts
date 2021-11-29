/* eslint-disable @typescript-eslint/no-explicit-any */
import Vec from '@tldraw/vec'
import { action, computed, makeObservable, observable } from 'mobx'
import { TLNuInputs } from './TLNuInputs'
import { TLNuPage } from './TLNuPage'
import { TLNuViewport } from './TLNuViewport'
import type { TLNuShape } from './TLNuShape'
import type {
  TLNuBinding,
  TLNuBounds,
  TLNuCallbacks,
  TLNuKeyboardHandler,
  TLNuPointerHandler,
  TLNuWheelHandler,
} from '~types'
import { BoundsUtils, KeyUtils } from '~utils'
import { TLNuSelectTool } from './NuSelectTool'
import type { TLNuTool } from '~nu-lib'

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
    Object.values(this.tools).forEach((tool) => {
      if (tool.shortcut !== undefined) {
        KeyUtils.registerShortcut(tool.shortcut, () => this.selectTool(tool))
      }
    })
  }

  @observable currentPageId = 'page'

  @observable inputs = new TLNuInputs()

  @observable viewport = new TLNuViewport()

  @observable tools: Record<string, TLNuTool<S>> = {
    select: new TLNuSelectTool(this),
  }

  @observable currentTool: TLNuTool<S> = this.tools['select']

  @action readonly selectTool = (tool: TLNuTool<S>) => {
    this.currentTool = tool
  }

  @observable pages: Record<string, TLNuPage<S, B>> = {
    page: new TLNuPage('page', 'page', [], []),
  }

  @computed get currentPage() {
    return this.pages[this.currentPageId]
  }

  @observable hoveredId?: string

  @computed get hoveredShape() {
    return this.hoveredId
      ? this.currentPage.shapes.find((shape) => shape.id === this.hoveredId)
      : undefined
  }

  @observable selectedIds: string[] = []

  @computed get selectedShapes(): S[] {
    return this.currentPage.shapes.filter((shape) => this.selectedIds.includes(shape.id))
  }

  @computed get selectedBounds(): TLNuBounds | undefined {
    return this.selectedShapes.length > 1
      ? BoundsUtils.getCommonBounds(this.selectedShapes.map((shape) => shape.bounds))
      : undefined
  }

  @computed get shapesInViewport(): S[] {
    const {
      currentPage,
      viewport: { currentView },
    } = this

    return currentPage.shapes.filter(
      (shape) =>
        shape.parentId === currentPage.id &&
        (BoundsUtils.boundsContain(currentView, shape.bounds) ||
          BoundsUtils.boundsCollide(currentView, shape.bounds))
    )
  }

  @observable brush?: TLNuBounds

  @action readonly setBrush = (brush: TLNuBounds) => {
    this.brush = brush
  }

  @action readonly clearBrush = () => {
    this.brush = undefined
  }

  @observable status = TLNuStatus.Idle

  @action readonly setStatus = (status: TLNuStatus) => {
    this.status = status
  }

  @action readonly hoverShape = (shape: S) => {
    this.hoveredId = shape.id
  }

  @action readonly clearHoveredShape = () => {
    this.hoveredId = undefined
  }

  @action readonly select = (...ids: string[]) => {
    this.selectedIds = ids
  }

  @action readonly deselectAll = () => {
    this.selectedIds.length = 0
  }

  @action readonly selectAll = () => {
    this.selectedIds = this.currentPage.shapes.map((shape) => shape.id)
  }

  /* --------------------- Methods -------------------- */

  readonly getPagePoint = (point: number[]) => {
    const { camera } = this.viewport
    return Vec.sub(Vec.div(point, camera.zoom), camera.point)
  }

  readonly getScreenPoint = (point: number[]) => {
    const { camera } = this.viewport
    return Vec.mul(Vec.add(point, camera.point), camera.zoom)
  }

  /* --------------------- Events --------------------- */

  readonly onPan: TLNuWheelHandler<S> = (info, e) => {
    this.currentTool.onPan?.(info, e)
  }

  readonly onPointerDown: TLNuPointerHandler<S> = (info, e) => {
    this.currentTool.onPointerDown?.(info, e)
  }

  readonly onPointerUp: TLNuPointerHandler<S> = (info, e) => {
    this.currentTool.onPointerUp?.(info, e)
  }

  readonly onPointerMove: TLNuPointerHandler<S> = (info, e) => {
    this.currentTool.onPointerMove?.(info, e)
  }

  readonly onPointerEnter: TLNuPointerHandler<S> = (info, e) => {
    this.currentTool.onPointerEnter?.(info, e)
  }

  readonly onPointerLeave: TLNuPointerHandler<S> = (info, e) => {
    this.currentTool.onPointerLeave?.(info, e)
  }

  readonly onKeyDown: TLNuKeyboardHandler<S> = (info, e) => {
    this.currentTool.onKeyDown?.(info, e)
  }

  readonly onKeyUp: TLNuKeyboardHandler<S> = (info, e) => {
    this.currentTool.onKeyUp?.(info, e)
  }
}
