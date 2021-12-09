/* eslint-disable @typescript-eslint/no-explicit-any */
import { action, makeObservable, observable } from 'mobx'
import type { TLNuShape } from '~nu-lib'
import type {
  TLNuOnTransition,
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

export class BaseStateNode<R = any, P = any> implements Partial<TLNuCallbacks> {
  constructor() {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const id = this.constructor['id'] as string

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const initial = this.constructor['initial'] as string | undefined

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const states = this.constructor['states'] as typeof BaseStateNode[]

    this._id = id
    this._initial = initial
    this._states = states

    if (this.states && this.states.length > 0) {
      this.registerStates(...this.states)
      const initialId = this.initial ?? this.states[0].id
      const state = this.children.get(initialId)

      if (state) {
        this.currentState = state
        this.currentState._events.onEnter({ fromId: 'initial' })
      }
    }

    makeObservable(this)
  }

  private _id: string

  get id() {
    return this._id
  }

  private _initial?: string

  get initial() {
    return this._initial
  }

  private _states: typeof BaseStateNode[]

  get states() {
    return this._states
  }

  private _isActive = false

  get isActive(): boolean {
    return this._isActive
  }

  /* ------------------ Child States ------------------ */

  children = new Map<string, BaseStateNode<R, this>>([])

  registerStates = (...stateClasses: typeof BaseStateNode[]) => {
    stateClasses.forEach((StateClass) => this.children.set(StateClass.id, new StateClass()))
  }

  deregisterStates = (...states: typeof BaseStateNode[]) => {
    states.forEach((StateClass) => {
      this.children.get(StateClass.id)?.dispose()
      this.children.delete(StateClass.id)
    })
  }

  @observable currentState: BaseStateNode<R, this> = {} as BaseStateNode<R, this>

  @action private setCurrentState(state: BaseStateNode<R, any>) {
    this.currentState = state
  }

  /**
   * Transition to a new active state.
   *
   * @param id The id of the new active state.
   * @param data (optional) Any data to send to the new active state's `onEnter` method.
   */
  transition = (id: string, data: Record<string, unknown> = {}) => {
    if (this.children.size === 0)
      throw Error(`State ${this.id}: No child states, cannot transition to ${id}.`)
    const nextState = this.children.get(id)
    const prevState = this.currentState
    if (!nextState)
      throw Error(`State ${this.id}: No child state named ${id}, cannot transition to ${id}.`)
    if (this.currentState) {
      prevState._events.onExit({ ...data, toId: id })
      this.setCurrentState(nextState)
      this._events.onTransition({ ...data, fromId: prevState.id, toId: id })
      nextState._events.onEnter({ ...data, fromId: prevState.id })
    } else {
      this.currentState = nextState
      nextState._events.onEnter({ ...data, fromId: '' })
    }
  }

  /* --------------- Keyboard Shortcuts --------------- */

  protected registerKeyboardShortcuts = () => {
    if (!this.shortcuts?.length) return

    this.disposables.push(
      ...this.shortcuts.map(({ keys, fn }) =>
        KeyUtils.registerShortcut(keys, () => {
          if (!this.isActive) return
          // fn(this, this)
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
    K extends keyof TLNuStateEvents,
    A extends Parameters<TLNuStateEvents[K]>
  >(
    eventName: keyof TLNuStateEvents,
    ...args: A
  ) => {
    if (this.currentState?._events?.[eventName]) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.currentState._events?.[eventName](...args)
    }
  }

  _events: TLNuStateEvents = {
    /**
     * Handle the change from inactive to active.
     *
     * @param info The previous state and any info sent via the transition.
     */
    onTransition: (info) => {
      this.onTransition?.(info)
    },

    /**
     * Handle the change from inactive to active.
     *
     * @param info The previous state and any info sent via the transition.
     */
    onEnter: (info) => {
      this._isActive = true
      if (this.initial) this.transition(this.initial, info)
      this.onEnter?.(info)
    },

    /**
     * Handle the change from active to inactive.
     *
     * @param info The next state and any info sent via the transition.
     */
    onExit: (info) => {
      this._isActive = false
      this.currentState?.onExit?.({ toId: 'external' })
      this.onExit?.(info)
    },

    /**
     * Respond to wheel events forwarded to the state by its parent. Run the current active child
     * state's handler, then the state's own handler.
     *
     * @param info The event info from TLNuInputs.
     * @param event The DOM event.
     */
    onWheel: (info, gesture, event) => {
      this.onWheel?.(info, gesture, event)
      this.forwardEvent('onWheel', info, gesture, event)
    },

    /**
     * Respond to pointer down events forwarded to the state by its parent. Run the current active
     * child state's handler, then the state's own handler.
     *
     * @param info The event info from TLNuInputs.
     * @param event The DOM event.
     */
    onPointerDown: (info, event) => {
      this.onPointerDown?.(info, event)
      this.forwardEvent('onPointerDown', info, event)
    },

    /**
     * Respond to pointer up events forwarded to the state by its parent. Run the current active
     * child state's handler, then the state's own handler.
     *
     * @param info The event info from TLNuInputs.
     * @param event The DOM event.
     */
    onPointerUp: (info, event) => {
      this.onPointerUp?.(info, event)
      this.forwardEvent('onPointerUp', info, event)
    },

    /**
     * Respond to pointer move events forwarded to the state by its parent. Run the current active
     * child state's handler, then the state's own handler.
     *
     * @param info The event info from TLNuInputs.
     * @param event The DOM event.
     */
    onPointerMove: (info, event) => {
      this.onPointerMove?.(info, event)
      this.forwardEvent('onPointerMove', info, event)
    },

    /**
     * Respond to pointer enter events forwarded to the state by its parent. Run the current active
     * child state's handler, then the state's own handler.
     *
     * @param info The event info from TLNuInputs.
     * @param event The DOM event.
     */
    onPointerEnter: (info, event) => {
      this.onPointerEnter?.(info, event)
      this.forwardEvent('onPointerEnter', info, event)
    },

    /**
     * Respond to pointer leave events forwarded to the state by its parent. Run the current active
     * child state's handler, then the state's own handler.
     *
     * @param info The event info from TLNuInputs.
     * @param event The DOM event.
     */
    onPointerLeave: (info, event) => {
      this.onPointerLeave?.(info, event)
      this.forwardEvent('onPointerLeave', info, event)
    },

    /**
     * Respond to key down events forwarded to the state by its parent. Run the current active child
     * state's handler, then the state's own handler.
     *
     * @param info The event info from TLNuInputs.
     * @param event The DOM event.
     */
    onKeyDown: (info, event) => {
      this._events.handleModifierKey(info, event)
      this.onKeyDown?.(info, event)
      this.forwardEvent('onKeyDown', info, event)
    },

    /**
     * Respond to key up events forwarded to the state by its parent. Run the current active child
     * state's handler, then the state's own handler.
     *
     * @param info The event info from TLNuInputs.
     * @param event The DOM event.
     */
    onKeyUp: (info, event) => {
      this._events.handleModifierKey(info, event)
      this.onKeyUp?.(info, event)
      this.forwardEvent('onKeyUp', info, event)
    },

    /**
     * Respond to pinch start events forwarded to the state by its parent. Run the current active
     * child state's handler, then the state's own handler.
     *
     * @param info The event info from TLNuInputs.
     * @param gesture The gesture info from useGesture.
     * @param event The DOM event.
     */
    onPinchStart: (info, gesture, event) => {
      this.onPinchStart?.(info, gesture, event)
      this.forwardEvent('onPinchStart', info, gesture, event)
    },

    /**
     * Respond to pinch events forwarded to the state by its parent. Run the current active child
     * state's handler, then the state's own handler.
     *
     * @param info The event info from TLNuInputs.
     * @param gesture The gesture info from useGesture.
     * @param event The DOM event.
     */
    onPinch: (info, gesture, event) => {
      this.onPinch?.(info, gesture, event)
      this.forwardEvent('onPinch', info, gesture, event)
    },

    /**
     * Respond to pinch end events forwarded to the state by its parent. Run the current active
     * child state's handler, then the state's own handler.
     *
     * @param info The event info from TLNuInputs.
     * @param gesture The gesture info from useGesture.
     * @param event The DOM event.
     */
    onPinchEnd: (info, gesture, event) => {
      this.onPinchEnd?.(info, gesture, event)
      this.forwardEvent('onPinchEnd', info, gesture, event)
    },

    /**
     * When a modifier key is pressed, treat it as a pointer move.
     *
     * @private
     * @param info The event info from TLNuInputs.
     * @param event The DOM event.
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

  onEnter?: TLNuOnEnter

  onExit?: TLNuOnExit

  onTransition?: TLNuOnTransition

  onWheel?: TLNuWheelHandler

  onPointerDown?: TLNuPointerHandler

  onPointerUp?: TLNuPointerHandler

  onPointerMove?: TLNuPointerHandler

  onPointerEnter?: TLNuPointerHandler

  onPointerLeave?: TLNuPointerHandler

  onKeyDown?: TLNuKeyboardHandler

  onKeyUp?: TLNuKeyboardHandler

  onPinchStart?: TLNuPinchHandler

  onPinch?: TLNuPinchHandler

  onPinchEnd?: TLNuPinchHandler
}
