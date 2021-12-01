/* eslint-disable @typescript-eslint/no-explicit-any */
import { action, makeObservable, observable } from 'mobx'
import type { TLNuApp, TLNuShape, TLNuState, TLNuStateClass } from '~nu-lib'
import type {
  TLNuBinding,
  TLNuCallbacks,
  TLNuKeyboardHandler,
  TLNuOnEnter,
  TLNuOnExit,
  TLNuPointerHandler,
  TLNuWheelHandler,
} from '~types'

export interface TLNuToolClass<
  S extends TLNuShape = TLNuShape,
  B extends TLNuBinding = TLNuBinding
> {
  new (props: any): TLNuTool<S, B>
  id: string
  shortcut: string
}

export interface TLNuToolComponentProps {
  isActive: boolean
}

export abstract class TLNuTool<S extends TLNuShape = TLNuShape, B extends TLNuBinding = TLNuBinding>
  implements Partial<TLNuCallbacks<S>>
{
  constructor(app: TLNuApp<S, B>) {
    this.app = app
    makeObservable(this)
  }

  static id: string
  static shortcut?: string

  readonly app: TLNuApp<S, B>

  abstract readonly Component?: (props: TLNuToolComponentProps) => JSX.Element

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

  onPan?: TLNuWheelHandler<S>
  onPointerDown?: TLNuPointerHandler<S>
  onPointerUp?: TLNuPointerHandler<S>
  onPointerMove?: TLNuPointerHandler<S>
  onPointerEnter?: TLNuPointerHandler<S>
  onPointerLeave?: TLNuPointerHandler<S>
  onKeyDown?: TLNuKeyboardHandler<S>
  onKeyUp?: TLNuKeyboardHandler<S>

  /* ----------------- Internal Events ---------------- */

  _onPan: TLNuWheelHandler<S> = (info, e) => {
    this.currentState.onPan?.(info, e)
    this.onPan?.(info, e)
  }

  _onPointerDown: TLNuPointerHandler<S> = (info, e) => {
    this.currentState.onPointerDown?.(info, e)
    this.onPointerDown?.(info, e)
  }

  _onPointerUp: TLNuPointerHandler<S> = (info, e) => {
    this.currentState.onPointerUp?.(info, e)
    this.onPointerUp?.(info, e)
  }

  _onPointerMove: TLNuPointerHandler<S> = (info, e) => {
    this.currentState.onPointerMove?.(info, e)
    this.onPointerMove?.(info, e)
  }

  _onPointerEnter: TLNuPointerHandler<S> = (info, e) => {
    this.currentState.onPointerEnter?.(info, e)
    this.onPointerEnter?.(info, e)
  }

  _onPointerLeave: TLNuPointerHandler<S> = (info, e) => {
    this.currentState.onPointerLeave?.(info, e)
    this.onPointerLeave?.(info, e)
  }

  _onKeyDown: TLNuKeyboardHandler<S> = (info, e) => {
    this.handleModifierKey(info, e)
    this.currentState.onKeyDown?.(info, e)
    this.onKeyDown?.(info, e)
  }

  _onKeyUp: TLNuKeyboardHandler<S> = (info, e) => {
    this.handleModifierKey(info, e)
    this.currentState.onKeyUp?.(info, e)
    this.onKeyUp?.(info, e)
  }

  handleModifierKey: TLNuKeyboardHandler<S> = (info, e) => {
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

  get toolId(): string {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return this.constructor['id']
  }
}
