import { TLBounds, TLBoundsHandle, TLBoundsWithCenter, Utils } from '@tldraw/core'
import type { Shape } from 'shapes'
import type { ArrowShape } from 'shapes/arrow'
import { AppData, INITIAL_DATA } from './constants'
import { makeHistory } from './history'

/*
This file contains the "mutable" part of our application's state.
The information in the `mutables` object is modified and relied 
on by certain actions but does not need to be part of our React 
state, so we can throw it all into a regular object.
*/

interface Mutables {
  snapshot: AppData
  rendererBounds: TLBounds
  viewport: TLBounds
  history: ReturnType<typeof makeHistory>
  initialPoint: number[]
  currentPoint: number[]
  previousPoint: number[]
  initialShape?: Shape
  isCloning: boolean
  pointedShapeId?: string
  pointedHandleId?: keyof ArrowShape['handles']
  pointedBoundsHandleId?: TLBoundsHandle
  initialCommonBounds?: TLBounds
  rawPoints: number[][]
  snapInfo?: {
    initialBounds: TLBoundsWithCenter
    all: TLBoundsWithCenter[]
    others: TLBoundsWithCenter[]
  }
}

export const mutables: Mutables = {
  snapshot: INITIAL_DATA,
  initialPoint: [0, 0],
  currentPoint: [0, 0],
  previousPoint: [0, 0],
  history: makeHistory(),
  rendererBounds: Utils.getBoundsFromPoints([
    [0, 0],
    [100, 100],
  ]),
  viewport: Utils.getBoundsFromPoints([
    [0, 0],
    [100, 100],
  ]),
  rawPoints: [],
  isCloning: false,
  pointedShapeId: undefined,
  pointedHandleId: undefined,
  pointedBoundsHandleId: undefined,
  initialCommonBounds: undefined,
  snapInfo: undefined,
}
