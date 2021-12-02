import { Vec } from '@tldraw/vec'
import { action, computed, makeObservable, observable } from 'mobx'
import { BoundsUtils } from '~utils'
import type { TLNuBounds } from '~types'

export class TLNuViewport {
  constructor() {
    makeObservable(this)
  }

  /* ------------------- Properties ------------------- */

  @observable bounds: TLNuBounds = {
    minX: 0,
    minY: 0,
    maxX: 1080,
    maxY: 720,
    width: 1080,
    height: 720,
  }

  @observable camera = {
    point: [0, 0],
    zoom: 1,
  }

  /* --------------------- Actions -------------------- */

  @action updateBounds = (bounds: TLNuBounds) => {
    this.bounds = bounds
  }

  @action panCamera = (delta: number[]) => {
    this.camera.point = Vec.sub(this.camera.point, delta)
  }

  @action update = ({ point, zoom }: Partial<{ point: number[]; zoom: number }>) => {
    if (point !== undefined) this.camera.point = point
    if (zoom !== undefined) this.camera.zoom = zoom
  }

  @computed get currentView(): TLNuBounds {
    const {
      bounds,
      camera: { point, zoom },
    } = this

    return BoundsUtils.getBoundsFromPoints([
      Vec.sub(Vec.div([bounds.minX, bounds.minY], zoom), point),
      Vec.sub(Vec.div([bounds.maxX, bounds.maxY], zoom), point),
    ])
  }

  getPagePoint = (point: number[]) => {
    const { camera } = this
    return Vec.sub(Vec.div(point, camera.zoom), camera.point)
  }
}
