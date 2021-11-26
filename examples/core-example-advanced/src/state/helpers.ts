import type { TLBounds, TLPageState } from '@tldraw/core'
import Vec from '@tldraw/vec'
import { FIT_TO_SCREEN_PADDING } from './constants'

export function getPagePoint(point: number[], pageState: TLPageState) {
  return Vec.sub(Vec.div(point, pageState.camera.zoom), pageState.camera.point)
}

export function getScreenPoint(point: number[], pageState: TLPageState) {
  return Vec.mul(Vec.add(point, pageState.camera.point), pageState.camera.zoom)
}

export function getZoomFitCamera(
  viewport: TLBounds,
  commonBounds: TLBounds,
  pageState: TLPageState
) {
  const { camera } = pageState

  let zoom = Math.min(
    (viewport.width - FIT_TO_SCREEN_PADDING) / commonBounds.width,
    (viewport.height - FIT_TO_SCREEN_PADDING) / commonBounds.height
  )

  zoom = camera.zoom === zoom || camera.zoom < 1 ? Math.min(1, zoom) : zoom

  const delta = [
    (viewport.width - commonBounds.width * zoom) / 2 / zoom,
    (viewport.height - commonBounds.height * zoom) / 2 / zoom,
  ]

  return {
    zoom,
    point: Vec.add([-commonBounds.minX, -commonBounds.minY], delta),
  }
}

export function getZoomedCameraPoint(nextZoom: number, center: number[], pageState: TLPageState) {
  const p0 = Vec.sub(Vec.div(center, pageState.camera.zoom), pageState.camera.point)
  const p1 = Vec.sub(Vec.div(center, nextZoom), pageState.camera.point)
  return Vec.toFixed(Vec.add(pageState.camera.point, Vec.sub(p1, p0)))
}
