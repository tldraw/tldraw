import type { WebKitGestureEvent } from '@use-gesture/core/types'
import { action, makeObservable, observable } from 'mobx'
import type React from 'react'

export class TLNuInputs {
  constructor() {
    makeObservable(this)
  }

  // note: fine for dev, but we probably don't need to make
  // any of these properties observable
  @observable shiftKey = false
  @observable ctrlKey = false
  @observable altKey = false
  @observable spaceKey = false
  @observable isPinching = false
  @observable currentScreenPoint = [0, 0]
  @observable currentPoint = [0, 0]
  @observable previousScreenPoint = [0, 0]
  @observable previousPoint = [0, 0]
  @observable originScreenPoint = [0, 0]
  @observable originPoint = [0, 0]

  @observable state: 'pointing' | 'pinching' | 'idle' = 'idle'

  private updateModifiers(
    event:
      | PointerEvent
      | React.PointerEvent
      | KeyboardEvent
      | React.KeyboardEvent
      | WheelEvent
      | React.WheelEvent
      | TouchEvent
      | WebKitGestureEvent
  ) {
    if ('clientX' in event) {
      this.previousScreenPoint = this.currentScreenPoint
      this.currentScreenPoint = [event.clientX, event.clientY]
    }

    this.shiftKey = event.shiftKey
    this.ctrlKey = event.metaKey || event.ctrlKey
    this.altKey = event.altKey
  }

  @action onWheel = (pagePoint: number[], event: React.WheelEvent | WheelEvent) => {
    if (this.state === 'pinching') return
    this.updateModifiers(event)
    this.previousPoint = this.currentPoint
    this.currentPoint = pagePoint
  }

  @action onPointerMove = (
    pagePoint: number[],
    event: PointerEvent | React.PointerEvent | WheelEvent
  ) => {
    if (this.state === 'pinching') return
    this.updateModifiers(event)
    this.previousPoint = this.currentPoint
    this.currentPoint = pagePoint
  }

  @action onPointerDown = (pagePoint: number[], event: PointerEvent | React.PointerEvent) => {
    if (this.state !== 'idle') return
    this.updateModifiers(event)
    this.originScreenPoint = this.currentScreenPoint
    this.originPoint = pagePoint
    this.state = 'pointing'
  }

  @action onPointerUp = (pagePoint: number[], event: PointerEvent | React.PointerEvent) => {
    this.updateModifiers(event)
    this.state = 'idle'
  }

  @action onKeyDown = (event: KeyboardEvent | React.KeyboardEvent) => {
    this.updateModifiers(event)
    switch (event.key) {
      case ' ': {
        this.spaceKey = true
        break
      }
    }
  }

  @action onKeyUp = (event: KeyboardEvent | React.KeyboardEvent) => {
    this.updateModifiers(event)
    switch (event.key) {
      case ' ': {
        this.spaceKey = false
        break
      }
    }
  }

  @action onPinchStart = (
    pagePoint: number[],
    event: WheelEvent | PointerEvent | TouchEvent | WebKitGestureEvent
  ) => {
    this.updateModifiers(event)
    this.state = 'pinching'
  }

  @action onPinch = (
    pagePoint: number[],
    event: WheelEvent | PointerEvent | TouchEvent | WebKitGestureEvent
  ) => {
    if (this.state !== 'pinching') return
    this.updateModifiers(event)
  }

  @action onPinchEnd = (
    pagePoint: number[],
    event: WheelEvent | PointerEvent | TouchEvent | WebKitGestureEvent
  ) => {
    if (this.state !== 'pinching') return
    this.updateModifiers(event)
    this.state = 'idle'
  }
}
