import { action, makeObservable, observable } from 'mobx'
import type React from 'react'

export class TLNuInputs {
  constructor() {
    makeObservable(this)
  }

  @observable shiftKey = false
  @observable ctrlKey = false
  @observable altKey = false
  @observable spaceKey = false

  @observable currentPoint = [0, 0]
  @observable previousPoint = [0, 0]
  @observable originPoint = [0, 0]

  @observable isPressed = false

  @action updateModifiers(
    event: PointerEvent | React.PointerEvent | KeyboardEvent | React.KeyboardEvent
  ) {
    this.shiftKey = event.shiftKey
    this.ctrlKey = event.metaKey || event.ctrlKey
    this.altKey = event.altKey
  }

  @action onPointerMove = (pagePoint: number[], event: PointerEvent | React.PointerEvent) => {
    this.previousPoint = this.currentPoint
    this.currentPoint = pagePoint
  }

  @action onPointerDown = (pagePoint: number[], event: PointerEvent | React.PointerEvent) => {
    this.originPoint = pagePoint
    this.isPressed = true
  }

  @action onPointerUp = (pagePoint: number[], event: PointerEvent | React.PointerEvent) => {
    this.isPressed = false
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
}
