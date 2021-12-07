/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TLNuApp, TLNuShape, TLNuTool } from '~nu-lib'
import type { TLNuBinding } from '~types'
import { TLNuState } from './TLNuState'

export interface TLNuToolStateClass<
  S extends TLNuShape = TLNuShape,
  B extends TLNuBinding = TLNuBinding,
  R extends TLNuApp<S, B> = TLNuApp<S, B>,
  P extends TLNuTool<S, B, R> = any
> {
  new (tool: P, app: R): TLNuToolState<S, B, R, P>
  id: string
}

export abstract class TLNuToolState<
  S extends TLNuShape = TLNuShape,
  B extends TLNuBinding = TLNuBinding,
  R extends TLNuApp<S, B> = TLNuApp<S, B>,
  P extends TLNuTool<S, B, R> = any
> extends TLNuState<S, B, R, P> {
  get app() {
    return this.root
  }

  get tool() {
    return this.parent
  }
}
