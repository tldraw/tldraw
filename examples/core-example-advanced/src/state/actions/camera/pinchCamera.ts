import type { TLPointerInfo } from '@tldraw/core'
import Vec from '@tldraw/vec'
import type { Action } from 'state/constants'

export const pinchCamera: Action = (data, payload: TLPointerInfo) => {
  const { camera } = data.pageState
  const nextZoom = payload.delta[2]
  const nextPoint = Vec.sub(camera.point, Vec.div(payload.delta, camera.zoom))
  const p0 = Vec.sub(Vec.div(payload.point, camera.zoom), nextPoint)
  const p1 = Vec.sub(Vec.div(payload.point, nextZoom), nextPoint)
  data.pageState.camera.point = Vec.toFixed(Vec.add(nextPoint, Vec.sub(p1, p0)))
  data.pageState.camera.zoom = nextZoom
}
