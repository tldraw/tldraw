import type { TLNuApp, TLNuShape, TLNuToolState } from '~nu-lib'
import type { TLNuBinding } from '~types'
import { TLNuState } from './TLNuState'

export interface TLNuToolClass<
  S extends TLNuShape = TLNuShape,
  B extends TLNuBinding = TLNuBinding,
  R extends TLNuApp<S, B> = TLNuApp<S, B>
> {
  new (parent: R, app: R): TLNuTool<S, B, R>
  id: string
}

export abstract class TLNuTool<
  S extends TLNuShape = TLNuShape,
  B extends TLNuBinding = TLNuBinding,
  R extends TLNuApp<S, B> = TLNuApp<S, B>
> extends TLNuState<S, B, R, R> {
  get app() {
    return this.root
  }
}
