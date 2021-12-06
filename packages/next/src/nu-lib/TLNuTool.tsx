/* eslint-disable @typescript-eslint/no-explicit-any */
import { action, makeObservable, observable } from 'mobx'
import type React from 'react'
import type { TLNuApp, TLNuShape, TLNuState, TLNuStateClass } from '~nu-lib'
import type {
  TLNuBinding,
  TLNuCallbacks,
  TLNuEventInfo,
  TLNuKeyboardHandler,
  TLNuOnEnter,
  TLNuOnExit,
  TLNuPinchHandler,
  TLNuPointerHandler,
  TLNuWheelHandler,
} from '~types'

export interface TLNuToolClass<
  S extends TLNuShape = TLNuShape,
  B extends TLNuBinding = TLNuBinding
> {
  new (props: any): TLNuTool<S, B>
  id: string
  shortcut?: string
  shortcuts?: { keys: string; fn: () => void }[]
}

export interface TLNuToolComponentProps {
  isActive: boolean
}

export abstract class TLNuTool<S extends TLNuShape = TLNuShape, B extends TLNuBinding = TLNuBinding>
  implements Partial<TLNuCallbacks<S>>
{
  constructor(app: TLNuApp<S, B>) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.toolId = this.constructor['id']
    this.app = app

    makeObservable(this)
  }

  static id: string
  static shortcut?: string
  static shortcuts?: { keys: string; fn: () => void }[]

  readonly toolId: string
  readonly app: TLNuApp<S, B>

  abstract readonly Component?: (props: TLNuToolComponentProps) => JSX.Element

  disposables: (() => void)[] = []

  dispose() {
    this.disposables.forEach((disposable) => disposable())
  }
  /* --------------------- States --------------------- */

  readonly states = new Map<string, TLNuState<S, B>>([])

  registerStates = (...stateClasses: TLNuStateClass<S, B>[]) => {
    stateClasses.forEach((StateClass) => this.states.set(StateClass.id, new StateClass(this)))
  }

  @observable currentState: TLNuState<S, B> = {} as TLNuState<S, B>

  @action transition = (id: string, data: Record<string, unknown> = {}) => {
    if (this.states.size === 0) throw Error(`Tool ${this.toolId} has no states.`)
    const nextState = this.states.get(id)
    if (!nextState) throw Error(`Could not find a state named ${id}.`)
    const currentStateId = this.currentState?.stateId || null
    if (this.currentState) {
      this.currentState.onExit?.({ ...data, fromId: nextState.stateId })
    }
    this.currentState = nextState
    this.currentState.onEnter?.({ ...data, fromId: currentStateId })
  }

  /* ------------------- Own Events ------------------- */

  onEnter?: TLNuOnEnter<any>
  onExit?: TLNuOnExit<any>

  onWheel?: TLNuWheelHandler<S>
  onPointerDown?: TLNuPointerHandler<S>
  onPointerUp?: TLNuPointerHandler<S>
  onPointerMove?: TLNuPointerHandler<S>
  onPointerEnter?: TLNuPointerHandler<S>
  onPointerLeave?: TLNuPointerHandler<S>
  onKeyDown?: TLNuKeyboardHandler<S>
  onKeyUp?: TLNuKeyboardHandler<S>
  onPinchStart?: TLNuPinchHandler<S>
  onPinch?: TLNuPinchHandler<S>
  onPinchEnd?: TLNuPinchHandler<S>

  /* ----------------- Internal Events ---------------- */

  readonly _onWheel: TLNuWheelHandler<S> = (info, gesture, e) => {
    this.currentState.onWheel?.(info, gesture, e)
    this.onWheel?.(info, gesture, e)
  }

  readonly _onPointerDown: TLNuPointerHandler<S> = (info, e) => {
    this.currentState.onPointerDown?.(info, e)
    this.onPointerDown?.(info, e)
  }

  readonly _onPointerUp: TLNuPointerHandler<S> = (info, e) => {
    this.currentState.onPointerUp?.(info, e)
    this.onPointerUp?.(info, e)
  }

  readonly _onPointerMove: TLNuPointerHandler<S> = (info, e) => {
    this.currentState.onPointerMove?.(info, e)
    this.onPointerMove?.(info, e)
  }

  readonly _onPointerEnter: TLNuPointerHandler<S> = (info, e) => {
    this.currentState.onPointerEnter?.(info, e)
    this.onPointerEnter?.(info, e)
  }

  readonly _onPointerLeave: TLNuPointerHandler<S> = (info, e) => {
    this.currentState.onPointerLeave?.(info, e)
    this.onPointerLeave?.(info, e)
  }

  readonly _onKeyDown: TLNuKeyboardHandler<S> = (info, e) => {
    this.handleModifierKey(info, e)
    this.currentState.onKeyDown?.(info, e)
    this.onKeyDown?.(info, e)
  }

  readonly _onKeyUp: TLNuKeyboardHandler<S> = (info, e) => {
    this.handleModifierKey(info, e)
    this.currentState.onKeyUp?.(info, e)
    this.onKeyUp?.(info, e)
  }

  readonly _onPinchStart: TLNuPinchHandler<S> = (info, gesture, e) => {
    this.currentState.onPinchStart?.(info, gesture, e)
    this.onPinchStart?.(info, gesture, e)
  }

  readonly _onPinch: TLNuPinchHandler<S> = (info, gesture, e) => {
    this.currentState.onPinch?.(info, gesture, e)
    this.onPinch?.(info, gesture, e)
  }

  readonly _onPinchEnd: TLNuPinchHandler<S> = (info, gesture, e) => {
    this.currentState.onPinchEnd?.(info, gesture, e)
    this.onPinchEnd?.(info, gesture, e)
  }

  handleModifierKey = (info: TLNuEventInfo<S>, e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Shift':
      case 'Alt':
      case 'Ctrl':
      case 'Meta': {
        this._onPointerMove(info, e)
        break
      }
    }
  }
}
