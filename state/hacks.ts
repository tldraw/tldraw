import { PointerInfo } from 'types'
import {
  getCameraZoom,
  getCurrentCamera,
  screenToWorld,
  setZoomCSS,
} from 'utils/utils'
import session from './session'
import state from './state'
import * as vec from 'utils/vec'

/**
 * While a user is drawing with the draw tool, we want to update the shape without
 * going through the trouble of updating the entire state machine. Speciifcally, we
 * do not want to push the change through immer. Instead, we'll push the change
 * directly to the state using `forceData`.
 * @param info
 */
export function fastDrawUpdate(info: PointerInfo) {
  const data = { ...state.data }

  session.current.update(
    data,
    screenToWorld(info.point, data),
    info.pressure,
    info.shiftKey
  )

  const selectedId = Array.from(data.selectedIds.values())[0]

  const shape = data.document.pages[data.currentPageId].shapes[selectedId]

  data.document.pages[data.currentPageId].shapes[selectedId] = { ...shape }

  state.forceData(Object.freeze(data))
}

export function fastPanUpdate(delta: number[]) {
  const data = { ...state.data }
  const camera = getCurrentCamera(data)
  camera.point = vec.sub(camera.point, vec.div(delta, camera.zoom))

  data.pageStates[data.currentPageId].camera = { ...camera }

  state.forceData(Object.freeze(data))
}

export function fastZoomUpdate(point: number[], delta: number) {
  const data = { ...state.data }
  const camera = getCurrentCamera(data)

  const next = camera.zoom - (delta / 100) * camera.zoom

  const p0 = screenToWorld(point, data)
  camera.zoom = getCameraZoom(next)
  const p1 = screenToWorld(point, data)
  camera.point = vec.add(camera.point, vec.sub(p1, p0))

  data.pageStates[data.currentPageId].camera = { ...camera }

  state.forceData(Object.freeze(data))
}

export function fastPinchCamera(
  point: number[],
  delta: number[],
  distanceDelta: number,
  angleDelta: number
) {
  const data = { ...state.data }
  const camera = getCurrentCamera(data)

  camera.point = vec.sub(camera.point, vec.div(delta, camera.zoom))

  const next = camera.zoom - (distanceDelta / 300) * camera.zoom

  const p0 = screenToWorld(point, data)
  camera.zoom = getCameraZoom(next)
  const p1 = screenToWorld(point, data)
  camera.point = vec.add(camera.point, vec.sub(p1, p0))

  data.pageStates[data.currentPageId].camera = { ...camera }

  state.forceData(Object.freeze(data))
}

export function fastBrushSelect(point: number[]) {
  const data = { ...state.data }
  session.current.update(data, screenToWorld(point, data))

  data.selectedIds = new Set(data.selectedIds)

  state.forceData(Object.freeze(data))
}
