import { inputs, TLBoundsEdge, TLBoundsCorner } from '@tldraw/core'
import type { TLDrawState } from '~state'

interface PointerOptions {
  id?: number
  x?: number
  y?: number
  shiftKey?: boolean
  altKey?: boolean
  ctrlKey?: boolean
}

export class TLStateUtils {
  tlstate: TLDrawState

  constructor(tlstate: TLDrawState) {
    this.tlstate = tlstate
  }

  hoverShape = (id: string, options: PointerOptions = {}) => {
    const { tlstate } = this
    tlstate.onHoverShape(inputs.pointerDown(this.getPoint(options), id), {} as React.PointerEvent)
  }

  pointCanvas = (options: PointerOptions = {}) => {
    this.tlstate.onPointCanvas(
      inputs.pointerDown(this.getPoint(options), 'canvas'),
      {} as React.PointerEvent
    )
    return this
  }

  pointShape = (id: string, options: PointerOptions = {}) => {
    this.tlstate.onPointShape(
      inputs.pointerDown(this.getPoint(options), id),
      {} as React.PointerEvent
    )
    return this
  }

  doubleClickShape = (id: string, options: PointerOptions = {}) => {
    this.tlstate.onDoubleClickShape(
      inputs.pointerDown(this.getPoint(options), id),
      {} as React.PointerEvent
    )
    return this
  }

  pointBounds = (options: PointerOptions = {}) => {
    this.tlstate.onPointBounds(
      inputs.pointerDown(this.getPoint(options), 'bounds'),
      {} as React.PointerEvent
    )
    return this
  }

  pointBoundsHandle = (
    id: TLBoundsCorner | TLBoundsEdge | 'rotate',
    options: PointerOptions = {}
  ) => {
    this.tlstate.onPointBounds(
      inputs.pointerDown(this.getPoint(options), 'bounds'),
      {} as React.PointerEvent
    )
    return this
  }

  stopPointing = (target = 'canvas', options: PointerOptions = {}) => {
    this.tlstate.onPointerUp(
      inputs.pointerUp(this.getPoint(options), target),
      {} as React.PointerEvent
    )
    return this
  }

  clickCanvas = (options: PointerOptions = {}) => {
    this.pointCanvas(options)
    this.stopPointing()
    return this
  }

  clickShape = (id: string, options: PointerOptions = {}) => {
    if (this.tlstate.selectedIds.includes(id)) {
      this.pointBounds(options)
    }
    this.pointShape(id, options)
    this.stopPointing(id, options)
    return this
  }

  clickBounds = (options: PointerOptions = {}) => {
    this.pointBounds(options)
    this.stopPointing('bounds', options)
    return this
  }

  clickBoundsHandle = (
    id: TLBoundsCorner | TLBoundsEdge | 'rotate',
    options: PointerOptions = {}
  ) => {
    this.pointBoundsHandle(id, options)
    this.stopPointing(id)
    return this
  }

  getPoint(options: PointerOptions = {} as PointerOptions): PointerEvent {
    const { id = 1, x = 0, y = 0, shiftKey = false, altKey = false, ctrlKey = false } = options

    return {
      shiftKey,
      altKey,
      ctrlKey,
      pointerId: id,
      clientX: x,
      clientY: y,
    } as PointerEvent
  }
}
