import { PointerInfo } from 'types'
import {
  getCameraZoom,
  getCurrentCamera,
  getSelectedIds,
  screenToWorld,
  setToArray,
  setZoomCSS,
} from 'utils/utils'
import { freeze } from 'immer'
import session from './session'
import state from './state'
import vec from 'utils/vec'

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

  const selectedId = setToArray(getSelectedIds(data))[0]

  const shape = data.document.pages[data.currentPageId].shapes[selectedId]

  data.document.pages[data.currentPageId].shapes[selectedId] = { ...shape }

  state.forceData(freeze(data))
}

export function fastPanUpdate(delta: number[]) {
  const data = { ...state.data }
  const camera = getCurrentCamera(data)
  camera.point = vec.sub(camera.point, vec.div(delta, camera.zoom))

  data.pageStates[data.currentPageId].camera = { ...camera }

  state.forceData(freeze(data))
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

  state.forceData(freeze(data))
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

  const next = camera.zoom - (distanceDelta / 350) * camera.zoom

  const p0 = screenToWorld(point, data)
  camera.zoom = getCameraZoom(next)
  const p1 = screenToWorld(point, data)
  camera.point = vec.add(camera.point, vec.sub(p1, p0))

  const pageState = data.pageStates[data.currentPageId]
  pageState.camera = { ...camera }

  data.pageStates[data.currentPageId] = { ...pageState }

  state.forceData(freeze(data))
}

export function fastBrushSelect(point: number[]) {
  const data = { ...state.data }

  session.current.update(data, screenToWorld(point, data))

  state.forceData(freeze(data))
}

export function fastTranslate(info: PointerInfo) {
  const data = { ...state.data }

  session.current.update(
    data,
    screenToWorld(info.point, data),
    info.shiftKey,
    info.altKey
  )

  state.forceData(freeze(data))
}

export function fastTransform(info: PointerInfo) {
  const data = { ...state.data }

  session.current.update(
    data,
    screenToWorld(info.point, data),
    info.shiftKey,
    info.altKey
  )

  state.forceData(freeze(data))
}
