import React from 'react'
import { TLKeyboardInfo, TLPointerInfo } from './types'
import { Vec, Utils } from './utils'

const DOUBLE_CLICK_DURATION = 250

class Inputs {
  activePointerId?: number

  pointer?: TLPointerInfo<string>
  points: Record<string, TLPointerInfo<string>> = {}

  keyboard?: TLKeyboardInfo
  keys: Record<string, boolean> = {}

  pointerUpTime = 0

  touchStart<T extends string>(e: TouchEvent | React.TouchEvent, target: T): TLPointerInfo<T> {
    const { shiftKey, ctrlKey, metaKey, altKey } = e
    e.preventDefault()

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

    this.points[touch.identifier] = info
    this.activePointerId = touch.identifier

    this.pointer = info
    return info
  }

  touchMove<T extends string>(e: TouchEvent | React.TouchEvent, target: T): TLPointerInfo<T> {
    const { shiftKey, ctrlKey, metaKey, altKey } = e
    e.preventDefault()

    const touch = e.changedTouches[0]

    const prev = this.points[touch.identifier]

    const point = Inputs.getPoint(touch)

    const delta = Vec.sub(point, prev.point)

    const info: TLPointerInfo<T> = {
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

    if (this.points[touch.identifier]) {
      this.points[touch.identifier] = info
    }

    this.pointer = info
    return info
  }

  pointerDown<T extends string>(e: PointerEvent | React.PointerEvent, target: T): TLPointerInfo<T> {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    const point = Inputs.getPoint(e)

    const info: TLPointerInfo<T> = {
      target,
      pointerId: e.pointerId,
      origin: point,
      point: point,
      delta: [e.movementX, e.movementY],
      pressure: Inputs.getPressure(e),
      shiftKey,
      ctrlKey,
      metaKey: Utils.isDarwin() ? metaKey : ctrlKey,
      altKey,
    }

    this.points[e.pointerId] = info
    this.activePointerId = e.pointerId
    this.pointer = info

    return info
  }

  pointerEnter<T extends string>(
    e: PointerEvent | React.PointerEvent,
    target: T,
  ): TLPointerInfo<T> {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    const point = Inputs.getPoint(e)

    const info: TLPointerInfo<T> = {
      target,
      pointerId: e.pointerId,
      origin: point,
      delta: [e.movementX, e.movementY],
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

    const prev = this.points[e.pointerId]

    const point = Inputs.getPoint(e)

    const info: TLPointerInfo<T> = {
      ...prev,
      target,
      pointerId: e.pointerId,
      point,
      delta: [e.movementX, e.movementY],
      pressure: Inputs.getPressure(e),
      shiftKey,
      ctrlKey,
      metaKey: Utils.isDarwin() ? metaKey : ctrlKey,
      altKey,
    }

    if (this.points[e.pointerId]) {
      this.points[e.pointerId] = info
    }

    this.pointer = info

    return info
  }

  pointerUp<T extends string>(e: PointerEvent | React.PointerEvent, target: T): TLPointerInfo<T> {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    const prev = this.points[e.pointerId]

    const point = Inputs.getPoint(e)

    const info: TLPointerInfo<T> = {
      ...prev,
      target,
      origin: prev?.origin || point,
      point: point,
      pressure: Inputs.getPressure(e),
      delta: [e.movementX, e.movementY],
      shiftKey,
      ctrlKey,
      metaKey: Utils.isDarwin() ? metaKey : ctrlKey,
      altKey,
    }

    delete this.points[e.pointerId]

    delete this.activePointerId

    this.pointer = info

    this.pointerUpTime = Date.now()

    return info
  }

  wheel = (e: WheelEvent): TLPointerInfo<'wheel'> => {
    const { shiftKey, ctrlKey, metaKey, altKey } = e
    return {
      target: 'wheel',
      pointerId: this.pointer?.pointerId || 0,
      origin: this.pointer?.origin || [0, 0],
      delta: [0, 0],
      pressure: 0.5,
      point: Inputs.getPoint(e),
      shiftKey,
      ctrlKey,
      metaKey,
      altKey,
    }
  }

  canAccept = (_pointerId: PointerEvent['pointerId']): boolean => {
    return true
    //   return (
    //     this.activePointerId === undefined || this.activePointerId === pointerId
    //   )
  }

  isDoubleClick() {
    if (!this.pointer) return

    const { origin, point } = this.pointer

    return Date.now() - this.pointerUpTime < DOUBLE_CLICK_DURATION && Vec.dist(origin, point) < 4
  }

  clear() {
    this.activePointerId = undefined
    this.pointer = undefined
    this.points = {}
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

    const info: TLPointerInfo<'pinch'> = {
      pointerId: 0,
      target: 'pinch',
      origin,
      delta: [0, 0],
      point: Vec.round(point),
      pressure: 0.5,
      shiftKey,
      ctrlKey,
      metaKey: Utils.isDarwin() ? metaKey : ctrlKey,
      altKey,
    }

    this.points[0] = info
    this.activePointerId = 0

    this.pointer = info
    return info
  }

  reset() {
    this.activePointerId = undefined
    this.pointerUpTime = 0

    this.pointer = undefined
    this.points = {}

    this.keyboard = undefined
    this.keys = {}
  }

  static getPoint(
    e: PointerEvent | React.PointerEvent | Touch | React.Touch | WheelEvent,
  ): number[] {
    return [Number(e.clientX.toPrecision(5)), Number(e.clientY.toPrecision(5))]
  }

  static getPressure(e: PointerEvent | React.PointerEvent | Touch | React.Touch | WheelEvent) {
    return 'pressure' in e ? Number(e.pressure.toPrecision(5)) || 0.5 : 0.5
  }

  static commandKey(): string {
    return Utils.isDarwin() ? '⌘' : 'Ctrl'
  }
}

export const inputs = new Inputs()
