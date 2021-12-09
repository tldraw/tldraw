/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TLNuApp, TLNuShape, TLNuTool } from '~nu-lib'
import { TLNuState } from './TLNuState'

export interface TLNuToolStateClass<
  S extends TLNuShape = TLNuShape,
  R extends TLNuApp<S> = TLNuApp<S>,
  P extends TLNuTool<S, R> = TLNuTool<S, R>
> {
  new (tool: P, app: R): TLNuToolState<S, R, P>
  id: string
}

export abstract class TLNuToolState<
  S extends TLNuShape = TLNuShape,
  R extends TLNuApp<S> = TLNuApp<S>,
  P extends R | TLNuTool<S, R> = TLNuTool<S, R>
> extends TLNuState<S, R, P> {
  get app() {
    return this.root
  }

  get tool() {
    return this.parent
  }
}
