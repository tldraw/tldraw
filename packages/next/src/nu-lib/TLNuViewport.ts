import { Vec } from '@tldraw/vec'
import { action, computed, makeObservable, observable } from 'mobx'
import { BoundsUtils } from '~utils'
import type { TLNuBounds } from '~types'
import { FIT_TO_SCREEN_PADDING } from '~constants'

export class TLNuViewport {
  constructor() {
    makeObservable(this)
  }

  readonly minZoom = 0.1
  readonly maxZoom = 8
  readonly zooms = [0.1, 0.25, 0.5, 1, 2, 4, 8]

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

  @action updateBounds = (bounds: TLNuBounds): this => {
    this.bounds = bounds
    return this
  }

  @action panCamera = (delta: number[]): this => {
    this.camera.point = Vec.sub(this.camera.point, Vec.div(delta, this.camera.zoom))
    return this
  }

  @action update = ({ point, zoom }: Partial<{ point: number[]; zoom: number }>): this => {
    if (point !== undefined) this.camera.point = point
    if (zoom !== undefined) this.camera.zoom = zoom
    return this
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

  getPagePoint = (point: number[]): number[] => {
    const { camera } = this
    return Vec.sub(Vec.div(point, camera.zoom), camera.point)
  }

  getScreenPoint = (point: number[]): number[] => {
    const { camera } = this
    return Vec.mul(Vec.add(point, camera.point), camera.zoom)
  }

  zoomIn = (): this => {
    const { camera, bounds, zooms } = this
    let zoom: number | undefined
    for (let i = 1; i < zooms.length; i++) {
      const z1 = zooms[i - 1]
      const z2 = zooms[i]
      if (z2 - camera.zoom <= (z2 - z1) / 2) continue
      zoom = z2
      break
    }
    if (zoom === undefined) zoom = zooms[zooms.length - 1]
    const center = [bounds.width / 2, bounds.height / 2]
    const p0 = Vec.sub(Vec.div(center, camera.zoom), center)
    const p1 = Vec.sub(Vec.div(center, zoom), center)
    return this.update({ point: Vec.toFixed(Vec.add(camera.point, Vec.sub(p1, p0))), zoom })
  }

  zoomOut = (): this => {
    const { camera, bounds, zooms } = this
    let zoom: number | undefined
    for (let i = zooms.length - 1; i > 0; i--) {
      const z1 = zooms[i - 1]
      const z2 = zooms[i]
      if (z2 - camera.zoom >= (z2 - z1) / 2) continue
      zoom = z1
      break
    }
    if (zoom === undefined) zoom = zooms[0]
    const center = [bounds.width / 2, bounds.height / 2]
    const p0 = Vec.sub(Vec.div(center, camera.zoom), center)
    const p1 = Vec.sub(Vec.div(center, zoom), center)
    return this.update({ point: Vec.toFixed(Vec.add(camera.point, Vec.sub(p1, p0))), zoom })
  }

  resetZoom = (): this => {
    const { bounds } = this
    return this.update({ point: this.getPagePoint([bounds.width / 2, bounds.height / 2]), zoom: 1 })
  }

  zoomToBounds = ({ width, height, minX, minY }: TLNuBounds): this => {
    const { bounds, camera } = this
    let zoom = Math.min(
      (bounds.width - FIT_TO_SCREEN_PADDING) / width,
      (bounds.height - FIT_TO_SCREEN_PADDING) / height
    )
    zoom = Math.min(
      this.maxZoom,
      Math.max(this.minZoom, camera.zoom === zoom || camera.zoom < 1 ? Math.min(1, zoom) : zoom)
    )
    const delta = [
      (bounds.width - width * zoom) / 2 / zoom,
      (bounds.height - height * zoom) / 2 / zoom,
    ]
    return this.update({ point: Vec.add([-minX, -minY], delta), zoom })
  }
}
