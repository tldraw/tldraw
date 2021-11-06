import { inputs, TLBoundsEdge, TLBoundsCorner, TLBoundsHandle } from '@tldraw/core'
import type { TLDrawState } from '~state'
import type { TLDrawShape } from '~types'

interface PointerOptions {
  id?: number
  x?: number
  y?: number
  shiftKey?: boolean
  altKey?: boolean
  ctrlKey?: boolean
}

export class TLDrawStateUtils {
  tlstate: TLDrawState

  constructor(tlstate: TLDrawState) {
    this.tlstate = tlstate
  }

  movePointer = (options: PointerOptions = {}) => {
    const { tlstate } = this
    tlstate.onPointerMove(inputs.pointerMove(this.getPoint(options), ''), {} as React.PointerEvent)
    return this
  }

  hoverShape = (id: string, options: PointerOptions = {}) => {
    const { tlstate } = this
    tlstate.onHoverShape(inputs.pointerDown(this.getPoint(options), id), {} as React.PointerEvent)
    return this
  }

  pointCanvas = (options: PointerOptions = {}) => {
    this.tlstate.onPointCanvas(
      inputs.pointerDown(this.getPoint(options), 'canvas'),
      {} as React.PointerEvent
    )
    this.tlstate.onPointerDown(
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
    this.tlstate.onPointerDown(
      inputs.pointerDown(this.getPoint(options), 'canvas'),
      {} as React.PointerEvent
    )
    return this
  }

  doubleClickShape = (id: string, options: PointerOptions = {}) => {
    this.tlstate.onDoubleClickShape(
      inputs.pointerDown(this.getPoint(options), id),
      {} as React.PointerEvent
    )
    this.tlstate.onPointerDown(
      inputs.pointerDown(this.getPoint(options), 'canvas'),
      {} as React.PointerEvent
    )
    return this
  }

  pointBounds = (options: PointerOptions = {}) => {
    this.tlstate.onPointBounds(
      inputs.pointerDown(this.getPoint(options), 'bounds'),
      {} as React.PointerEvent
    )
    this.tlstate.onPointerDown(
      inputs.pointerDown(this.getPoint(options), 'canvas'),
      {} as React.PointerEvent
    )
    return this
  }

  pointBoundsHandle = (id: TLBoundsHandle, options: PointerOptions = {}) => {
    this.tlstate.onPointBoundsHandle(
      inputs.pointerDown(this.getPoint(options), id),
      {} as React.PointerEvent
    )
    this.tlstate.onPointerDown(
      inputs.pointerDown(this.getPoint(options), 'canvas'),
      {} as React.PointerEvent
    )
    return this
  }

  doubleClickBoundHandle = (id: TLBoundsHandle, options: PointerOptions = {}) => {
    this.tlstate.onDoubleClickBoundsHandle(
      inputs.pointerDown(this.getPoint(options), id),
      {} as React.PointerEvent
    )
    this.tlstate.onPointerDown(
      inputs.pointerDown(this.getPoint(options), 'canvas'),
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
    this.hoverShape(id)
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

  expectSelectedIdsToBe = (b: string[]) => {
    expect(new Set(this.tlstate.selectedIds)).toEqual(new Set(b))
    return this
  }

  expectShapesToBeAtPoints = (shapes: Record<string, number[]>) => {
    Object.entries(shapes).forEach(([id, point]) => {
      expect(this.tlstate.getShape(id).point).toEqual(point)
    })
    return this
  }

  expectShapesToHaveProps = <T extends TLDrawShape>(shapes: Record<string, Partial<T>>) => {
    Object.entries(shapes).forEach(([id, props]) => {
      const shape = this.tlstate.getShape<T>(id)
      Object.entries(props).forEach(([key, value]) => {
        expect(shape[key as keyof T]).toEqual(value)
      })
    })
    return this
  }
}
