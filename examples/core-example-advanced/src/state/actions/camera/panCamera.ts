import type { Action } from 'state/constants'
import type { TLPointerInfo } from '@tldraw/core'
import Vec from '@tldraw/vec'

export const panCamera: Action = (data, payload: TLPointerInfo) => {
  const { point, zoom } = data.pageState.camera
  data.pageState.camera.point = Vec.sub(point, Vec.div(payload.delta, zoom))
}
