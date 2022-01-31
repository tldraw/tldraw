import { inputs, TLBoundsEdge, TLBoundsCorner, TLBoundsHandle } from '@tldraw/core'
import { TldrawApp } from '~state'
import type { TDShape } from '~types'

interface PointerOptions {
  id?: number
  x?: number
  y?: number
  pressure?: number
  shiftKey?: boolean
  altKey?: boolean
  ctrlKey?: boolean
}

export class TldrawTestApp extends TldrawApp {
  hoverShape = (id: string, options: PointerOptions = {}) => {
    this.onHoverShape(inputs.pointerDown(this.getPoint(options), id), {} as React.PointerEvent)
    return this
  }

  movePointer = (options?: PointerOptions | number[]) => {
    this.onPointerMove(inputs.pointerMove(this.getPoint(options), ''), {} as React.PointerEvent)
    return this
  }

  pointCanvas = (options?: PointerOptions | number[]) => {
    this.onPointCanvas(
      inputs.pointerDown(this.getPoint(options), 'canvas'),
      {} as React.PointerEvent
    )
    this.onPointerDown(
      inputs.pointerDown(this.getPoint(options), 'canvas'),
      {} as React.PointerEvent
    )
    return this
  }

  pointShape = (id: string, options?: PointerOptions | number[]) => {
    this.onPointShape(inputs.pointerDown(this.getPoint(options), id), {} as React.PointerEvent)
    this.onPointerDown(
      inputs.pointerDown(this.getPoint(options), 'canvas'),
      {} as React.PointerEvent
    )
    return this
  }

  doubleClickShape = (id: string, options?: PointerOptions | number[]) => {
    this.onPointerDown(
      inputs.pointerDown(this.getPoint(options), 'canvas'),
      {} as React.PointerEvent
    )
    this.onDoubleClickShape(
      inputs.pointerDown(this.getPoint(options), id),
      {} as React.PointerEvent
    )
    this.onPointerUp(inputs.pointerUp(this.getPoint(options), 'canvas'), {} as React.PointerEvent)
    return this
  }

  pointBounds = (options?: PointerOptions | number[]) => {
    this.onPointBounds(
      inputs.pointerDown(this.getPoint(options), 'bounds'),
      {} as React.PointerEvent
    )
    this.onPointerDown(
      inputs.pointerDown(this.getPoint(options), 'canvas'),
      {} as React.PointerEvent
    )
    return this
  }

  pointBoundsHandle = (id: TLBoundsHandle, options?: PointerOptions | number[]) => {
    this.onPointBoundsHandle(
      inputs.pointerDown(this.getPoint(options), id),
      {} as React.PointerEvent
    )
    this.onPointerDown(inputs.pointerDown(this.getPoint(options), id), {} as React.PointerEvent)
    return this
  }

  doubleClickBoundHandle = (id: TLBoundsHandle, options?: PointerOptions | number[]) => {
    this.onPointerDown(inputs.pointerDown(this.getPoint(options), id), {} as React.PointerEvent)
    this.onPointerUp(inputs.pointerUp(this.getPoint(options), id), {} as React.PointerEvent)
    this.onPointerDown(inputs.pointerDown(this.getPoint(options), id), {} as React.PointerEvent)
    this.onDoubleClickBoundsHandle(
      inputs.pointerUp(this.getPoint(options), id),
      {} as React.PointerEvent
    )
    this.onReleaseBoundsHandle?.(
      inputs.pointerDown(this.getPoint(options), id),
      {} as React.PointerEvent
    )
    this.onPointerUp?.(inputs.pointerUp(this.getPoint(options), id), {} as React.PointerEvent)
    return this
  }

  stopPointing = (target = 'canvas', options?: PointerOptions | number[]) => {
    this.onPointerUp(inputs.pointerUp(this.getPoint(options), target), {} as React.PointerEvent)
    return this
  }

  clickCanvas = (options?: PointerOptions | number[]) => {
    this.pointCanvas(options)
    this.stopPointing()
    return this
  }

  clickShape = (id: string, options?: PointerOptions | number[]) => {
    this.hoverShape(id)
    this.pointShape(id, options)
    this.onReleaseShape(inputs.pointerUp(this.getPoint(options), id), {} as React.PointerEvent)
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

  getPoint(options: PointerOptions | number[] = {} as PointerOptions): PointerEvent {
    const opts = Array.isArray(options)
      ? { x: options[0], y: options[1], pressure: options[2] }
      : options
    const {
      id = 1,
      x = 0,
      y = 0,
      pressure = 0.5,
      shiftKey = false,
      altKey = false,
      ctrlKey = false,
    } = opts

    return {
      shiftKey,
      altKey,
      ctrlKey,
      pointerId: id,
      pressure,
      clientX: x,
      clientY: y,
    } as PointerEvent
  }

  expectSelectedIdsToBe = (b: string[]) => {
    expect(new Set(this.selectedIds)).toEqual(new Set(b))
    return this
  }

  expectShapesToBeAtPoints = (shapes: Record<string, number[]>) => {
    Object.entries(shapes).forEach(([id, point]) => {
      expect(this.getShape(id).point).toEqual(point)
    })
    return this
  }

  expectShapesToHaveProps = <T extends TDShape>(shapes: Record<string, Partial<T>>) => {
    Object.entries(shapes).forEach(([id, props]) => {
      const shape = this.getShape<T>(id)
      Object.entries(props).forEach(([key, value]) => {
        expect(shape[key as keyof T]).toEqual(value)
      })
    })
    return this
  }

  pressKey = (key: string) => {
    const e = { key } as KeyboardEvent
    this.onKeyDown(key, inputs.keydown(e), e)
    return this
  }

  releaseKey = (key: string) => {
    const e = { key } as KeyboardEvent
    this.onKeyUp(key, inputs.keyup(e), e)
    return this
  }
}
