import React from 'react'
import { TLKeyboardInfo, TLPointerInfo } from './types'
import { Vec, Utils } from './utils'

const DOUBLE_CLICK_DURATION = 250

class Inputs {
  activePointerId?: number
  pointerUpTime = 0

  pointer?: TLPointerInfo
  points: Record<string, TLPointerInfo> = {}

  keyboard?: TLKeyboardInfo
  keys: Record<string, boolean> = {}

  touchStart(e: TouchEvent | React.TouchEvent, target: string) {
    const { shiftKey, ctrlKey, metaKey, altKey } = e
    e.preventDefault()

    const touch = e.changedTouches[0]

    const info: TLPointerInfo = {
      target,
      pointerId: touch.identifier,
      origin: Inputs.getPoint(touch),
      point: Inputs.getPoint(touch),
      pressure: 0.5,
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

  touchMove(e: TouchEvent | React.TouchEvent): TLPointerInfo {
    const { shiftKey, ctrlKey, metaKey, altKey } = e
    e.preventDefault()

    const touch = e.changedTouches[0]

    const prev = this.points[touch.identifier]

    const info: TLPointerInfo = {
      ...prev,
      pointerId: touch.identifier,
      point: Inputs.getPoint(touch),
      pressure: 0.5,
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

  pointerDown(
    e: PointerEvent | React.PointerEvent,
    target: string
  ): TLPointerInfo {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    const info: TLPointerInfo = {
      target,
      pointerId: e.pointerId,
      origin: Inputs.getPoint(e),
      point: Inputs.getPoint(e),
      pressure: e.pressure || 0.5,
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

  pointerEnter(
    e: PointerEvent | React.PointerEvent,
    target: string
  ): TLPointerInfo {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    const info: TLPointerInfo = {
      target,
      pointerId: e.pointerId,
      origin: Inputs.getPoint(e),
      point: Inputs.getPoint(e),
      pressure: e.pressure || 0.5,
      shiftKey,
      ctrlKey,
      metaKey: Utils.isDarwin() ? metaKey : ctrlKey,
      altKey,
    }

    this.pointer = info
    return info
  }

  pointerMove(
    e: PointerEvent | React.PointerEvent,
    target = ''
  ): TLPointerInfo {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    const prev = this.points[e.pointerId]

    const info: TLPointerInfo = {
      ...prev,
      target,
      pointerId: e.pointerId,
      point: Inputs.getPoint(e),
      pressure: e.pressure || 0.5,
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

  pointerUp = (
    e: PointerEvent | React.PointerEvent,
    target = ''
  ): TLPointerInfo => {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    const prev = this.points[e.pointerId]

    const info: TLPointerInfo = {
      ...prev,
      target,
      origin: prev?.origin || Inputs.getPoint(e),
      point: Inputs.getPoint(e),
      pressure: e.pressure || 0.5,
      shiftKey,
      ctrlKey,
      metaKey: Utils.isDarwin() ? metaKey : ctrlKey,
      altKey,
    }

    delete this.points[e.pointerId]

    delete this.activePointerId

    if (Vec.dist(info.origin, info.point) < 8) {
      this.pointerUpTime = Date.now()
    }

    this.pointer = info

    return info
  }

  wheel = (e: WheelEvent): TLPointerInfo => {
    const { shiftKey, ctrlKey, metaKey, altKey } = e
    return {
      target: 'wheel',
      pointerId: this.pointer?.pointerId || 0,
      origin: this.pointer?.origin || [0, 0],
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

    return (
      Date.now() - this.pointerUpTime < DOUBLE_CLICK_DURATION &&
      Vec.dist(origin, point) < 4
    )
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

    const info: TLPointerInfo = {
      pointerId: 0,
      target: 'pinch',
      origin,
      point: [...point, 0.5],
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
    e: PointerEvent | React.PointerEvent | Touch | React.Touch | WheelEvent
  ): number[] {
    return [
      Number(e.clientX.toPrecision(5)),
      Number(e.clientY.toPrecision(5)),
      'pressure' in e ? Number(e.pressure.toPrecision(5)) || 0.5 : 0.5,
    ]
  }

  static commandKey(): string {
    return Utils.isDarwin() ? '⌘' : 'Ctrl'
  }
}

export const inputs = new Inputs()
