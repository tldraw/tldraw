import React from 'react'
import { KeyboardInfo, PointerInfo } from 'types'
import vec from 'utils/vec'
import { isDarwin, getPoint } from 'utils'

const DOUBLE_CLICK_DURATION = 250

class Inputs {
  activePointerId?: number
  pointerUpTime = 0

  pointer: PointerInfo
  points: Record<string, PointerInfo> = {}

  keyboard: KeyboardInfo
  keys: Record<string, boolean> = {}

  touchStart(e: TouchEvent | React.TouchEvent, target: string) {
    const { shiftKey, ctrlKey, metaKey, altKey } = e
    e.preventDefault()

    const touch = e.changedTouches[0]

    const info = {
      target,
      pointerId: touch.identifier,
      origin: getPoint(touch),
      point: getPoint(touch),
      pressure: 0.5,
      shiftKey,
      ctrlKey,
      metaKey: isDarwin() ? metaKey : ctrlKey,
      altKey,
    }

    this.points[touch.identifier] = info
    this.activePointerId = touch.identifier

    this.pointer = info
    return info
  }

  touchMove(e: TouchEvent | React.TouchEvent) {
    const { shiftKey, ctrlKey, metaKey, altKey } = e
    e.preventDefault()

    const touch = e.changedTouches[0]

    const prev = this.points[touch.identifier]

    const info = {
      ...prev,
      pointerId: touch.identifier,
      point: getPoint(touch),
      pressure: 0.5,
      shiftKey,
      ctrlKey,
      metaKey: isDarwin() ? metaKey : ctrlKey,
      altKey,
    }

    if (this.points[touch.identifier]) {
      this.points[touch.identifier] = info
    }

    this.pointer = info
    return info
  }

  pointerDown(e: PointerEvent | React.PointerEvent, target: string) {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    const info = {
      target,
      pointerId: e.pointerId,
      origin: getPoint(e),
      point: getPoint(e),
      pressure: e.pressure || 0.5,
      shiftKey,
      ctrlKey,
      metaKey: isDarwin() ? metaKey : ctrlKey,
      altKey,
    }

    this.points[e.pointerId] = info
    this.activePointerId = e.pointerId
    this.pointer = info

    return info
  }

  pointerEnter(e: PointerEvent | React.PointerEvent, target: string) {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    const info = {
      target,
      pointerId: e.pointerId,
      origin: getPoint(e),
      point: getPoint(e),
      pressure: e.pressure || 0.5,
      shiftKey,
      ctrlKey,
      metaKey: isDarwin() ? metaKey : ctrlKey,
      altKey,
    }

    this.pointer = info
    return info
  }

  pointerMove(e: PointerEvent | React.PointerEvent, target = '') {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    const prev = this.points[e.pointerId]

    const info = {
      ...prev,
      target,
      pointerId: e.pointerId,
      point: getPoint(e),
      pressure: e.pressure || 0.5,
      shiftKey,
      ctrlKey,
      metaKey: isDarwin() ? metaKey : ctrlKey,
      altKey,
    }

    if (this.points[e.pointerId]) {
      this.points[e.pointerId] = info
    }

    this.pointer = info

    return info
  }

  pointerUp = (e: PointerEvent | React.PointerEvent, target = '') => {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    const prev = this.points[e.pointerId]

    const info = {
      ...prev,
      target,
      origin: prev?.origin || getPoint(e),
      point: getPoint(e),
      pressure: e.pressure || 0.5,
      shiftKey,
      ctrlKey,
      metaKey: isDarwin() ? metaKey : ctrlKey,
      altKey,
    }

    delete this.points[e.pointerId]

    delete this.activePointerId

    if (vec.dist(info.origin, info.point) < 8) {
      this.pointerUpTime = Date.now()
    }

    this.pointer = info

    return info
  }

  wheel = (e: WheelEvent) => {
    const { shiftKey, ctrlKey, metaKey, altKey } = e
    return { point: getPoint(e), shiftKey, ctrlKey, metaKey, altKey }
  }

  canAccept = (pointerId: PointerEvent['pointerId']): boolean => {
    pointerId
    return true
  }

  // canAccept = (pointerId: PointerEvent['pointerId']) => {
  //   return (
  //     this.activePointerId === undefined || this.activePointerId === pointerId
  //   )
  // }

  isDoubleClick() {
    if (!this.pointer) return

    const { origin, point } = this.pointer

    return (
      Date.now() - this.pointerUpTime < DOUBLE_CLICK_DURATION &&
      vec.dist(origin, point) < 4
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

  keydown = (e: KeyboardEvent | React.KeyboardEvent): KeyboardInfo => {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    this.keys[e.key] = true

    return {
      key: e.key,
      keys: Object.keys(this.keys),
      shiftKey,
      ctrlKey,
      metaKey: isDarwin() ? metaKey : ctrlKey,
      altKey,
    }
  }

  keyup = (e: KeyboardEvent | React.KeyboardEvent): KeyboardInfo => {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    delete this.keys[e.key]

    return {
      key: e.key,
      keys: Object.keys(this.keys),
      shiftKey,
      ctrlKey,
      metaKey: isDarwin() ? metaKey : ctrlKey,
      altKey,
    }
  }

  reset() {
    this.activePointerId = undefined
    this.pointerUpTime = 0

    this.pointer = undefined
    this.points = {}

    this.keyboard = undefined
    this.keys = {}
  }
}

export default new Inputs()
