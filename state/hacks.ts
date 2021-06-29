import { DrawShape, PointerInfo } from 'types'
import { setToArray } from 'utils'
import tld from 'utils/tld'
import { freeze } from 'immer'
import session from './session'
import state from './state'
import vec from 'utils/vec'
import * as Session from './sessions'

/**
 * While a user is drawing with the draw tool, we want to update the shape without
 * going through the trouble of updating the entire state machine. Speciifcally, we
 * do not want to push the change through immer. Instead, we'll push the change
 * directly to the state using `forceData`.
 * @param info
 */
export function fastDrawUpdate(info: PointerInfo): void {
  const data = { ...state.data }

  session.update<Session.DrawSession>(
    data,
    tld.screenToWorld(info.point, data),
    info.pressure,
    info.shiftKey
  )

  const selectedId = setToArray(tld.getSelectedIds(data))[0]

  const shape = data.document.pages[data.currentPageId].shapes[
    selectedId
  ] as DrawShape

  ;(data.document.pages[data.currentPageId].shapes[selectedId] as DrawShape) = {
    ...shape,
    points: [...shape.points],
  }

  state.forceData(freeze(data))
}

export function fastPanUpdate(delta: number[]): void {
  const data = { ...state.data }
  const camera = tld.getCurrentCamera(data)
  camera.point = vec.sub(camera.point, vec.div(delta, camera.zoom))

  data.pageStates[data.currentPageId].camera = { ...camera }

  state.forceData(freeze(data))
}

export function fastZoomUpdate(point: number[], delta: number): void {
  const data = { ...state.data }
  const camera = tld.getCurrentCamera(data)

  const next = camera.zoom - (delta / 100) * camera.zoom

  const p0 = tld.screenToWorld(point, data)
  camera.zoom = tld.getCameraZoom(next)
  const p1 = tld.screenToWorld(point, data)
  camera.point = vec.add(camera.point, vec.sub(p1, p0))

  data.pageStates[data.currentPageId].camera = { ...camera }

  state.forceData(freeze(data))
}

export function fastPinchCamera(
  point: number[],
  delta: number[],
  distanceDelta: number
): void {
  const data = { ...state.data }
  const camera = tld.getCurrentCamera(data)

  camera.point = vec.sub(camera.point, vec.div(delta, camera.zoom))

  const next = camera.zoom - (distanceDelta / 350) * camera.zoom

  const p0 = tld.screenToWorld(point, data)
  camera.zoom = tld.getCameraZoom(next)
  const p1 = tld.screenToWorld(point, data)
  camera.point = vec.add(camera.point, vec.sub(p1, p0))

  const pageState = data.pageStates[data.currentPageId]
  pageState.camera = { ...camera }

  data.pageStates[data.currentPageId] = { ...pageState }

  state.forceData(freeze(data))
}

export function fastBrushSelect(point: number[]): void {
  const data = { ...state.data }

  session.update<Session.BrushSession>(data, tld.screenToWorld(point, data))

  state.forceData(freeze(data))
}

export function fastTranslate(info: PointerInfo): void {
  const data = { ...state.data }

  session.update<Session.TranslateSession>(
    data,
    tld.screenToWorld(info.point, data),
    info.shiftKey,
    info.altKey
  )

  state.forceData(freeze(data))
}

export function fastTransform(info: PointerInfo): void {
  const data = { ...state.data }

  session.update<Session.TransformSession | Session.TransformSingleSession>(
    data,
    tld.screenToWorld(info.point, data),
    info.shiftKey
  )

  state.forceData(freeze(data))
}
