/* eslint-disable @typescript-eslint/no-explicit-any */
import { action, makeObservable, observable } from 'mobx'
import type { TLNuApp, TLNuShape } from '../'
import type {
  TLNuBinding,
  TLNuCallbacks,
  TLNuKeyboardHandler,
  TLNuPointerHandler,
  TLNuWheelHandler,
} from '~types'

export interface TLNuToolComponentProps {
  isActive: boolean
}

export abstract class TLNuTool<
  S extends TLNuShape = TLNuShape,
  B extends TLNuBinding = TLNuBinding,
  T extends string = any
> implements Partial<TLNuCallbacks<S>>
{
  constructor(app: TLNuApp<S, B>) {
    this.app = app
    makeObservable(this)
  }

  readonly app: TLNuApp<S, B>

  abstract readonly id: string
  abstract readonly shortcut?: string
  abstract readonly label?: string
  abstract readonly Component?: (props: TLNuToolComponentProps) => JSX.Element
  abstract onPan?: TLNuWheelHandler<S>
  abstract onPointerDown?: TLNuPointerHandler<S>
  abstract onPointerUp?: TLNuPointerHandler<S>
  abstract onPointerMove?: TLNuPointerHandler<S>
  abstract onPointerEnter?: TLNuPointerHandler<S>
  abstract onPointerLeave?: TLNuPointerHandler<S>
  abstract onKeyDown?: TLNuKeyboardHandler<S>
  abstract onKeyUp?: TLNuKeyboardHandler<S>

  @observable status: T = 'idle' as T

  @action setStatus = (status: T) => {
    this.status = status
  }
}
