import React from 'react'
import { PointerInfo } from 'types'
import { isDarwin } from 'utils/utils'

const DOUBLE_CLICK_DURATION = 300

class Inputs {
  activePointerId?: number
  lastPointerDownTime = 0
  points: Record<string, PointerInfo> = {}

  touchStart(e: TouchEvent | React.TouchEvent, target: string) {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    const touch = e.changedTouches[0]

    const info = {
      target,
      pointerId: touch.identifier,
      origin: [touch.clientX, touch.clientY],
      point: [touch.clientX, touch.clientY],
      shiftKey,
      ctrlKey,
      metaKey: isDarwin() ? metaKey : ctrlKey,
      altKey,
    }

    this.points[touch.identifier] = info
    this.activePointerId = touch.identifier

    return info
  }

  touchMove(e: TouchEvent | React.TouchEvent) {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    const touch = e.changedTouches[0]

    const prev = this.points[touch.identifier]

    const info = {
      ...prev,
      pointerId: touch.identifier,
      point: [touch.clientX, touch.clientY],
      shiftKey,
      ctrlKey,
      metaKey: isDarwin() ? metaKey : ctrlKey,
      altKey,
    }

    if (this.points[touch.identifier]) {
      this.points[touch.identifier] = info
    }

    return info
  }

  pointerDown(e: PointerEvent | React.PointerEvent, target: string) {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    const info = {
      target,
      pointerId: e.pointerId,
      origin: [e.clientX, e.clientY, e.pressure],
      point: [e.clientX, e.clientY, e.pressure],
      shiftKey,
      ctrlKey,
      metaKey: isDarwin() ? metaKey : ctrlKey,
      altKey,
    }

    this.points[e.pointerId] = info
    this.activePointerId = e.pointerId

    return info
  }

  pointerEnter(e: PointerEvent | React.PointerEvent, target: string) {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    const info = {
      target,
      pointerId: e.pointerId,
      origin: [e.clientX, e.clientY, e.pressure],
      point: [e.clientX, e.clientY, e.pressure],
      shiftKey,
      ctrlKey,
      metaKey: isDarwin() ? metaKey : ctrlKey,
      altKey,
    }

    return info
  }

  pointerMove(e: PointerEvent | React.PointerEvent) {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    const prev = this.points[e.pointerId]

    const info = {
      ...prev,
      pointerId: e.pointerId,
      point: [e.clientX, e.clientY, e.pressure],
      shiftKey,
      ctrlKey,
      metaKey: isDarwin() ? metaKey : ctrlKey,
      altKey,
    }

    if (this.points[e.pointerId]) {
      this.points[e.pointerId] = info
    }

    return info
  }

  pointerUp(e: PointerEvent | React.PointerEvent) {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    const prev = this.points[e.pointerId]

    const info = {
      ...prev,
      origin: prev?.origin || [e.clientX, e.clientY],
      point: [e.clientX, e.clientY],
      shiftKey,
      ctrlKey,
      metaKey: isDarwin() ? metaKey : ctrlKey,
      altKey,
    }

    delete this.points[e.pointerId]
    delete this.activePointerId
    this.lastPointerDownTime = Date.now()

    return info
  }

  wheel(e: WheelEvent) {
    const { shiftKey, ctrlKey, metaKey, altKey } = e
    return { point: [e.clientX, e.clientY], shiftKey, ctrlKey, metaKey, altKey }
  }

  canAccept(pointerId: PointerEvent['pointerId']) {
    return (
      this.activePointerId === undefined || this.activePointerId === pointerId
    )
  }

  isDoubleClick() {
    return Date.now() - this.lastPointerDownTime < DOUBLE_CLICK_DURATION
  }

  get pointer() {
    return this.points[Object.keys(this.points)[0]]
  }
}

export default new Inputs()
