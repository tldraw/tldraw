import { action, makeObservable, observable } from 'mobx'
import type { TLNuShape } from '~nu-lib'
import type {
  TLNuCallbacks,
  TLNuKeyboardHandler,
  TLNuPointerHandler,
  TLNuWheelHandler,
} from '~types'

export class TLNuTool<S extends TLNuShape = TLNuShape, T extends string = any>
  implements Partial<TLNuCallbacks<S>>
{
  constructor() {
    makeObservable(this)
  }

  @observable status: T = 'idle' as T

  @action setStatus = (status: T) => {
    this.status = status
  }

  onPan?: TLNuWheelHandler<S>
  onPointerDown?: TLNuPointerHandler<S>
  onPointerUp?: TLNuPointerHandler<S>
  onPointerMove?: TLNuPointerHandler<S>
  onPointerEnter?: TLNuPointerHandler<S>
  onPointerLeave?: TLNuPointerHandler<S>
  onKeyDown?: TLNuKeyboardHandler<S>
  onKeyUp?: TLNuKeyboardHandler<S>
}
