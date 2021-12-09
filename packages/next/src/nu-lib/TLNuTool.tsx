import type { TLNuApp, TLNuShape } from '~nu-lib'
import { TLNuState } from './TLNuState'

export interface TLNuToolClass<S extends TLNuShape = TLNuShape, R extends TLNuApp<S> = TLNuApp<S>> {
  new (parent: R, app: R): TLNuTool<S, R>
  id: string
}

export abstract class TLNuTool<
  S extends TLNuShape = TLNuShape,
  R extends TLNuApp<S> = TLNuApp<S>
> extends TLNuState<S, R, R> {
  get app() {
    return this.root
  }
}
