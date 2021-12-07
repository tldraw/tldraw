/* eslint-disable @typescript-eslint/no-explicit-any */
import { action, makeObservable, observable } from 'mobx'
import type { TLNuShape } from '~nu-lib'
import type {
  TLNuBinding,
  TLNuCallbacks,
  TLNuKeyboardHandler,
  TLNuOnEnter,
  TLNuOnExit,
  TLNuPinchHandler,
  TLNuPointerHandler,
  TLNuShortcut,
  TLNuWheelHandler,
  TLNuStateEvents,
} from '~types'
import { KeyUtils } from '~utils'

export interface TLNuStateClass<
  S extends TLNuShape = TLNuShape,
  B extends TLNuBinding = TLNuBinding,
  R extends TLNuRootState<S, B> = TLNuRootState<S, B>,
  P extends R | TLNuState<S, B, any, R> = any
> {
  new (parent: P, root: R): TLNuState<S, B, R, P>
  id: string
}

export abstract class TLNuRootState<S extends TLNuShape, B extends TLNuBinding>
  implements Partial<TLNuCallbacks<S>>
{
  constructor() {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const id = this.constructor['id'] as string

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const initial = this.constructor['initial'] as string | undefined

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const states = this.constructor['states'] as TLNuStateClass<S, B>[]

    this._id = id
    this._initial = initial
    this._states = states
  }

  private _id: string
  private _initial?: string
  private _states: TLNuStateClass<S, B, any>[]
  private _isActive = false

  get initial() {
    return this._initial
  }

  get states() {
    return this._states
  }

  get id() {
    return this._id
  }

  get isActive(): boolean {
    return this._isActive
  }

  get descendants(): (TLNuState<S, B, any, any> | this)[] {
    return Array.from(this.children.values()).flatMap((state) => [state, ...state.descendants])
  }

  /* ------------------ Child States ------------------ */

  children = new Map<string, TLNuState<S, B, any, any>>([])

  registerStates = (...stateClasses: TLNuStateClass<S, B, any, any>[]) => {
    stateClasses.forEach((StateClass) =>
      this.children.set(StateClass.id, new StateClass(this, this))
    )
  }

  deregisterStates = (...states: TLNuStateClass<S, B, any, any>[]) => {
    states.forEach((StateClass) => {
      this.children.get(StateClass.id)?.dispose()
      this.children.delete(StateClass.id)
    })
  }

  @observable currentState: TLNuState<S, B, any, any> = {} as TLNuState<S, B, any, any>

  @action setCurrentState(state: TLNuState<S, B, any, any>) {
    this.currentState = state
  }

  /**
   * Transition to a new active state.
   * @param id The id of the new active state.
   * @param data (optional) Any data to send to the new active state's `onEnter` method.
   */
  transition = (id: string, data: Record<string, unknown> = {}) => {
    if (this.children.size === 0)
      throw Error(`Tool ${this.id} has no states, cannot transition to ${id}.`)
    const nextState = this.children.get(id)
    const prevState = this.currentState
    if (!nextState) throw Error(`Could not find a state named ${id}.`)
    if (this.currentState) {
      prevState._events.onExit({ ...data, toId: id })
      this.setCurrentState(nextState)
      nextState._events.onEnter({ ...data, fromId: prevState.id })
    } else {
      this.currentState = nextState
      nextState._events.onEnter({ ...data, fromId: '' })
    }
  }

  /* --------------- Keyboard Shortcuts --------------- */

  protected registerKeyboardShortcuts() {
    if (!this.shortcuts?.length) return

    this.disposables.push(
      ...this.shortcuts.map(({ keys, fn }) =>
        KeyUtils.registerShortcut(keys, () => {
          if (!this.isActive) return
          fn()
        })
      )
    )
  }

  protected disposables: (() => void)[] = []

  dispose() {
    this.disposables.forEach((disposable) => disposable())
    return this
  }

  /* ----------------- Internal Events ---------------- */

  private forwardEvent = <
    K extends keyof TLNuStateEvents<S>,
    A extends Parameters<TLNuStateEvents<S>[K]>
  >(
    eventName: keyof TLNuStateEvents<S>,
    ...args: A
  ) => {
    if (this.currentState?._events?.[eventName]) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.currentState._events?.[eventName](...args)
    }
  }

  _events: TLNuStateEvents<S> = {
    /**
     * Handle the change from inactive to active.
     * @param info The previous state and any info sent via the transition.
     */
    onEnter: (info) => {
      this._isActive = true
      if (this.initial) this.transition(this.initial, info)
      this.onEnter?.(info)
    },
    /**
     * Handle the change from active to inactive.
     * @param info The next state and any info sent via the transition.
     */
    onExit: (info) => {
      this._isActive = false
      this.currentState?.onExit?.({ fromId: 'parent' })
      this.onExit?.(info)
    },

    /**
     * Respond to wheel events forwarded to the state by its parent. Run the current active child state's handler, then the state's own handler.
     * @param info The event info from TLNuInputs.
     * @param event The DOM event.
     */
    onWheel: (info, gesture, event) => {
      this.forwardEvent('onWheel', info, gesture, event)
      this.onWheel?.(info, gesture, event)
    },

    /**
     * Respond to pointer down events forwarded to the state by its parent. Run the current active child state's handler, then the state's own handler.
     * @param info The event info from TLNuInputs.
     * @param event The DOM event.
     */
    onPointerDown: (info, event) => {
      this.forwardEvent('onPointerDown', info, event)
      this.onPointerDown?.(info, event)
    },

    /**
     * Respond to pointer up events forwarded to the state by its parent. Run the current active child state's handler, then the state's own handler.
     * @param info The event info from TLNuInputs.
     * @param event The DOM event.
     */
    onPointerUp: (info, event) => {
      this.forwardEvent('onPointerUp', info, event)
      this.onPointerUp?.(info, event)
    },

    /**
     * Respond to pointer move events forwarded to the state by its parent. Run the current active child state's handler, then the state's own handler.
     * @param info The event info from TLNuInputs.
     * @param event The DOM event.
     */
    onPointerMove: (info, event) => {
      this.forwardEvent('onPointerMove', info, event)
      this.onPointerMove?.(info, event)
    },

    /**
     * Respond to pointer enter events forwarded to the state by its parent. Run the current active child state's handler, then the state's own handler.
     * @param info The event info from TLNuInputs.
     * @param event The DOM event.
     */
    onPointerEnter: (info, event) => {
      this.forwardEvent('onPointerEnter', info, event)
      this.onPointerEnter?.(info, event)
    },

    /**
     * Respond to pointer leave events forwarded to the state by its parent. Run the current active child state's handler, then the state's own handler.
     * @param info The event info from TLNuInputs.
     * @param event The DOM event.
     */
    onPointerLeave: (info, event) => {
      this.forwardEvent('onPointerLeave', info, event)
      this.onPointerLeave?.(info, event)
    },

    /**
     * Respond to key down events forwarded to the state by its parent. Run the current active child state's handler, then the state's own handler.
     * @param info The event info from TLNuInputs.
     * @param event The DOM event.
     */
    onKeyDown: (info, event) => {
      this._events.handleModifierKey(info, event)
      this.forwardEvent('onKeyDown', info, event)
      this.onKeyDown?.(info, event)
    },

    /**
     * Respond to key up events forwarded to the state by its parent. Run the current active child state's handler, then the state's own handler.
     * @param info The event info from TLNuInputs.
     * @param event The DOM event.
     */
    onKeyUp: (info, event) => {
      this._events.handleModifierKey(info, event)
      this.forwardEvent('onKeyUp', info, event)
      this.onKeyUp?.(info, event)
    },

    /**
     * Respond to pinch start events forwarded to the state by its parent. Run the current active child state's handler, then the state's own handler.
     * @param info The event info from TLNuInputs.
     * @param gesture The gesture info from useGesture.
     * @param event The DOM event.
     */
    onPinchStart: (info, gesture, event) => {
      this.forwardEvent('onPinchStart', info, gesture, event)
      this.onPinchStart?.(info, gesture, event)
    },

    /**
     * Respond to pinch events forwarded to the state by its parent. Run the current active child state's handler, then the state's own handler.
     * @param info The event info from TLNuInputs.
     * @param gesture The gesture info from useGesture.
     * @param event The DOM event.
     */
    onPinch: (info, gesture, event) => {
      this.forwardEvent('onPinch', info, gesture, event)
      this.onPinch?.(info, gesture, event)
    },

    /**
     * Respond to pinch end events forwarded to the state by its parent. Run the current active child state's handler, then the state's own handler.
     * @param info The event info from TLNuInputs.
     * @param gesture The gesture info from useGesture.
     * @param event The DOM event.
     */
    onPinchEnd: (info, gesture, event) => {
      this.forwardEvent('onPinchEnd', info, gesture, event)
      this.onPinchEnd?.(info, gesture, event)
    },

    /**
     * When a modifier key is pressed, treat it as a pointer move.
     * @param info The event info from TLNuInputs.
     * @param event The DOM event.
     * @private
     */
    handleModifierKey: (info, event) => {
      switch (event.key) {
        case 'Shift':
        case 'Alt':
        case 'Ctrl':
        case 'Meta': {
          this._events.onPointerMove(info, event)
          break
        }
      }
    },
  }

  /* ----------------- For Subclasses ----------------- */

  static id: string

  shortcuts?: TLNuShortcut[]

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
}

export abstract class TLNuState<
  S extends TLNuShape,
  B extends TLNuBinding,
  R extends TLNuRootState<S, B>,
  P extends TLNuState<S, B, R, any> | R
> extends TLNuRootState<S, B> {
  constructor(parent: P, root: R) {
    super()
    this._parent = parent
    this._root = root

    if (this.states && this.states.length > 0) {
      this.registerStates(...this.states)
      const initialId = this.initial ?? this.states[0].id
      const state = this.children.get(initialId)
      if (state) {
        this.setCurrentState(state)
        this.currentState?._events.onEnter({ fromId: 'initial' })
      }
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const shortcut = this.constructor['shortcut'] as string

    if (shortcut) {
      KeyUtils.registerShortcut(shortcut, () => {
        this.parent.transition(this.id)
      })
    }

    this.registerKeyboardShortcuts()

    makeObservable(this)
  }

  protected _root: R
  protected _parent: P

  get root() {
    return this._root
  }

  get parent() {
    return this._parent
  }

  get ascendants(): (P | TLNuState<S, B, R, P>)[] {
    if (!this.parent) return [this]
    if (!('ascendants' in this.parent)) return [this.parent, this]
    return [...(this.parent as TLNuState<S, B, R, any>).ascendants, this]
  }

  children = new Map<string, TLNuState<S, B, R, any>>([])

  registerStates = (...stateClasses: TLNuStateClass<S, B, R, any>[]) => {
    stateClasses.forEach((StateClass) =>
      this.children.set(StateClass.id, new StateClass(this, this._root))
    )
  }

  deregisterStates = (...states: TLNuStateClass<S, B, R, any>[]) => {
    states.forEach((StateClass) => {
      this.children.get(StateClass.id)?.dispose()
      this.children.delete(StateClass.id)
    })
  }
}
