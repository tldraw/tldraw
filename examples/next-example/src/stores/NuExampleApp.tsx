import type { TLNuKeyboardHandler, TLNuPointerHandler, TLNuWheelHandler } from '@tldraw/next'
import { TLNuApp } from '@tldraw/next/src/lib'
import { action, makeObservable } from 'mobx'
import type { NuBoxShape } from './NuBoxShape'

type Shape = NuBoxShape

export class NuExampleApp extends TLNuApp {
  constructor() {
    super()
    makeObservable(this)
  }

  @action selectShape(shape: Shape, push = false) {
    if (!push) this.selectedShapes.length = 0
    this.selectedShapes.push(shape)
  }

  onPan: TLNuWheelHandler = (info, e) => {
    // noop
  }

  onPointerDown: TLNuPointerHandler = (info, e) => {
    console.log(info.target)
    // noop
  }

  onPointerUp: TLNuPointerHandler = (info, e) => {
    // noop
  }

  onPointerMove: TLNuPointerHandler = (info, e) => {
    // noop
  }

  onPointerEnter: TLNuPointerHandler = (info, e) => {
    // noop
  }

  onPointerLeave: TLNuPointerHandler = (info, e) => {
    // noop
  }

  onKeyDown: TLNuKeyboardHandler = (info, e) => {
    // noop
  }

  onKeyUp: TLNuKeyboardHandler = (info, e) => {
    // noop
  }
}
