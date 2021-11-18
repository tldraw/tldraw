import type { TLBounds } from '@tldraw/core'
import Vec from '@tldraw/vec'
import type { Action } from 'state/constants'
import { mutables } from 'state/mutables'

export const setViewport: Action = (data, payload: { bounds: TLBounds }) => {
  const { camera } = data.pageState
  const { width, height } = payload.bounds

  const [minX, minY] = Vec.sub(Vec.div([0, 0], camera.zoom), camera.point)
  const [maxX, maxY] = Vec.sub(Vec.div([width, height], camera.zoom), camera.point)

  mutables.rendererBounds = { ...payload.bounds }

  mutables.viewport = {
    minX,
    minY,
    maxX,
    maxY,
    height: maxX - minX,
    width: maxY - minY,
  }
}
