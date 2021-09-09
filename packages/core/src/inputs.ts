import type React from 'react'
import type { TLKeyboardInfo, TLPointerInfo } from './types'
import { Vec, Utils } from './utils'

const DOUBLE_CLICK_DURATION = 250

export class Inputs {
  pointer?: TLPointerInfo<string>
  keyboard?: TLKeyboardInfo
  keys: Record<string, boolean> = {}
  isPinching = false

  offset = [0, 0]
  size = [10, 10]

  pointerUpTime = 0

  activePointer?: number

  pointerIsValid(e: TouchEvent | React.TouchEvent | PointerEvent | React.PointerEvent) {
    if ('pointerId' in e) {
      if (this.activePointer && this.activePointer !== e.pointerId) return false
    }

    if ('touches' in e) {
      const touch = e.changedTouches[0]
      if (this.activePointer && this.activePointer !== touch.identifier) return false
    }

    return true
  }

  touchStart<T extends string>(e: TouchEvent | React.TouchEvent, target: T): TLPointerInfo<T> {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    const touch = e.changedTouches[0]

    this.activePointer = touch.identifier

    const info: TLPointerInfo<T> = {
      target,
      pointerId: touch.identifier,
      origin: Inputs.getPoint(touch),
      delta: [0, 0],
      point: Inputs.getPoint(touch),
      pressure: Inputs.getPressure(touch),
      shiftKey,
      ctrlKey,
      metaKey: Utils.isDarwin() ? metaKey : ctrlKey,
      altKey,
    }

    this.pointer = info

    return info
  }

  touchEnd<T extends string>(e: TouchEvent | React.TouchEvent, target: T): TLPointerInfo<T> {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    const touch = e.changedTouches[0]

    const info: TLPointerInfo<T> = {
      target,
      pointerId: touch.identifier,
      origin: Inputs.getPoint(touch),
      delta: [0, 0],
      point: Inputs.getPoint(touch),
      pressure: Inputs.getPressure(touch),
      shiftKey,
      ctrlKey,
      metaKey: Utils.isDarwin() ? metaKey : ctrlKey,
      altKey,
    }

    this.pointer = info

    this.activePointer = undefined

    return info
  }

  touchMove<T extends string>(e: TouchEvent | React.TouchEvent, target: T): TLPointerInfo<T> {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    const touch = e.changedTouches[0]

    const prev = this.pointer

    const point = Inputs.getPoint(touch)

    const delta = prev?.point ? Vec.sub(point, prev.point) : [0, 0]

    const info: TLPointerInfo<T> = {
      origin: point,
      ...prev,
      target,
      pointerId: touch.identifier,
      point,
      delta,
      pressure: Inputs.getPressure(touch),
      shiftKey,
      ctrlKey,
      metaKey: Utils.isDarwin() ? metaKey : ctrlKey,
      altKey,
    }

    this.pointer = info

    return info
  }

  pointerDown<T extends string>(e: PointerEvent | React.PointerEvent, target: T): TLPointerInfo<T> {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    const point = Inputs.getPoint(e, this.offset)

    this.activePointer = e.pointerId

    const info: TLPointerInfo<T> = {
      target,
      pointerId: e.pointerId,
      origin: point,
      point: point,
      delta: [0, 0],
      pressure: Inputs.getPressure(e),
      shiftKey,
      ctrlKey,
      metaKey: Utils.isDarwin() ? metaKey : ctrlKey,
      altKey,
    }

    this.pointer = info

    return info
  }

  pointerEnter<T extends string>(
    e: PointerEvent | React.PointerEvent,
    target: T
  ): TLPointerInfo<T> {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    const point = Inputs.getPoint(e, this.offset)

    const info: TLPointerInfo<T> = {
      target,
      pointerId: e.pointerId,
      origin: point,
      delta: [0, 0],
      point: point,
      pressure: Inputs.getPressure(e),
      shiftKey,
      ctrlKey,
      metaKey: Utils.isDarwin() ? metaKey : ctrlKey,
      altKey,
    }

    this.pointer = info

    return info
  }

  pointerMove<T extends string>(e: PointerEvent | React.PointerEvent, target: T): TLPointerInfo<T> {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    const prev = this.pointer

    const point = Inputs.getPoint(e, this.offset)

    const delta = prev?.point ? Vec.sub(point, prev.point) : [0, 0]

    const info: TLPointerInfo<T> = {
      origin: point,
      ...prev,
      target,
      pointerId: e.pointerId,
      point,
      delta,
      pressure: Inputs.getPressure(e),
      shiftKey,
      ctrlKey,
      metaKey: Utils.isDarwin() ? metaKey : ctrlKey,
      altKey,
    }

    this.pointer = info

    return info
  }

  pointerUp<T extends string>(e: PointerEvent | React.PointerEvent, target: T): TLPointerInfo<T> {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    const prev = this.pointer

    const point = Inputs.getPoint(e, this.offset)

    const delta = prev?.point ? Vec.sub(point, prev.point) : [0, 0]

    this.activePointer = undefined

    const info: TLPointerInfo<T> = {
      origin: point,
      ...prev,
      target,
      pointerId: e.pointerId,
      point,
      delta,
      pressure: Inputs.getPressure(e),
      shiftKey,
      ctrlKey,
      metaKey: Utils.isDarwin() ? metaKey : ctrlKey,
      altKey,
    }

    this.pointer = info

    this.pointerUpTime = Date.now()

    return info
  }

  panStart = (e: WheelEvent): TLPointerInfo<'wheel'> => {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    const info: TLPointerInfo<'wheel'> = {
      target: 'wheel',
      pointerId: this.pointer?.pointerId || 0,
      origin: this.pointer?.origin || [0, 0],
      delta: [0, 0],
      pressure: 0.5,
      point: Inputs.getPoint(e, this.offset),
      shiftKey,
      ctrlKey,
      metaKey,
      altKey,
    }

    this.pointer = info

    return info
  }

  pan = (delta: number[], e: WheelEvent): TLPointerInfo<'wheel'> => {
    if (!this.pointer || this.pointer.target !== 'wheel') {
      return this.panStart(e)
    }

    const { shiftKey, ctrlKey, metaKey, altKey } = e

    const prev = this.pointer

    const point = Inputs.getPoint(e, this.offset)

    const info: TLPointerInfo<'wheel'> = {
      ...prev,
      target: 'wheel',
      delta,
      point,
      shiftKey,
      ctrlKey,
      metaKey,
      altKey,
    }

    this.pointer = info

    return info
  }

  isDoubleClick() {
    if (!this.pointer) return false

    const { origin, point } = this.pointer

    return Date.now() - this.pointerUpTime < DOUBLE_CLICK_DURATION && Vec.dist(origin, point) < 4
  }

  clear() {
    this.pointer = undefined
  }

  resetDoubleClick() {
    this.pointerUpTime = 0
  }

  keydown = (e: KeyboardEvent | React.KeyboardEvent): TLKeyboardInfo => {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    this.keys[e.key] = true

    return {
      point: this.pointer?.point || [0, 0],
      origin: this.pointer?.origin || [0, 0],
      key: e.key,
      keys: Object.keys(this.keys),
      shiftKey,
      ctrlKey,
      metaKey: Utils.isDarwin() ? metaKey : ctrlKey,
      altKey,
    }
  }

  keyup = (e: KeyboardEvent | React.KeyboardEvent): TLKeyboardInfo => {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    delete this.keys[e.key]

    return {
      point: this.pointer?.point || [0, 0],
      origin: this.pointer?.origin || [0, 0],
      key: e.key,
      keys: Object.keys(this.keys),
      shiftKey,
      ctrlKey,
      metaKey: Utils.isDarwin() ? metaKey : ctrlKey,
      altKey,
    }
  }

  pinch(point: number[], origin: number[]) {
    const { shiftKey, ctrlKey, metaKey, altKey } = this.keys

    const delta = Vec.sub(origin, point)

    const info: TLPointerInfo<'pinch'> = {
      pointerId: 0,
      target: 'pinch',
      origin,
      delta: delta,
      point: Vec.sub(Vec.round(point), this.offset),
      pressure: 0.5,
      shiftKey,
      ctrlKey,
      metaKey: Utils.isDarwin() ? metaKey : ctrlKey,
      altKey,
    }

    this.pointer = info

    return info
  }

  reset() {
    this.pointerUpTime = 0
    this.pointer = undefined
    this.keyboard = undefined
    this.activePointer = undefined
    this.keys = {}
  }

  static getPoint(
    e: PointerEvent | React.PointerEvent | Touch | React.Touch | WheelEvent,
    offset = [0, 0]
  ): number[] {
    return [
      Number(e.clientX.toPrecision(5)) - offset[0],
      Number(e.clientY.toPrecision(5)) - offset[1],
    ]
  }

  static getPressure(e: PointerEvent | React.PointerEvent | Touch | React.Touch | WheelEvent) {
    return 'pressure' in e ? Number(e.pressure.toPrecision(5)) || 0.5 : 0.5
  }

  static commandKey(): string {
    return Utils.isDarwin() ? '⌘' : 'Ctrl'
  }
}

export const inputs = new Inputs()
