import Vec from '@tldraw/vec'
import { action, computed, makeObservable, observable, untracked } from 'mobx'
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
import { BoundsUtils } from '~utils'

export enum TLNuStatus {
  Idle = 'idle',
  PointingCanvas = 'pointingCanvas',
  Brushing = 'brushing',
  PointingShape = 'pointingShape',
  TranslatingShapes = 'translatingShapes',
  PointingBounds = 'pointingBounds',
}

export class TLNuApp<S extends TLNuShape = TLNuShape, B extends TLNuBinding = TLNuBinding>
  implements Partial<TLNuCallbacks<S>>
{
  constructor() {
    makeObservable(this)
  }

  @observable currentPageId = 'page'

  @observable inputs = new TLNuInputs()

  @observable viewport = new TLNuViewport()

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

  @action setBrush = (brush: TLNuBounds) => {
    this.brush = brush
  }

  @action clearBrush = () => {
    this.brush = undefined
  }

  @observable status = TLNuStatus.Idle

  @action setStatus = (status: TLNuStatus) => {
    this.status = status
  }

  @action hoverShape = (shape: S) => {
    this.hoveredId = shape.id
  }

  @action clearHoveredShape = () => {
    this.hoveredId = undefined
  }

  @action select = (...ids: string[]) => {
    this.selectedIds = ids
  }

  @action deselectAll = () => {
    this.selectedIds.length = 0
  }

  @action selectAll = () => {
    this.selectedIds = this.currentPage.shapes.map((shape) => shape.id)
  }

  /* --------------------- Methods -------------------- */

  getPagePoint(point: number[]) {
    const { camera } = this.viewport
    return Vec.sub(Vec.div(point, camera.zoom), camera.point)
  }

  getScreenPoint(point: number[]) {
    const { camera } = this.viewport
    return Vec.mul(Vec.add(point, camera.point), camera.zoom)
  }

  /* --------------------- Events --------------------- */

  onPan?: TLNuWheelHandler<S>
  onPointerDown?: TLNuPointerHandler<S>
  onPointerUp?: TLNuPointerHandler<S>
  onPointerMove?: TLNuPointerHandler<S>
  onPointerEnter?: TLNuPointerHandler<S>
  onPointerLeave?: TLNuPointerHandler<S>
  onKeyDown?: TLNuKeyboardHandler<S>
  onKeyUp?: TLNuKeyboardHandler<S>
}
