/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TLNuApp, TLNuShape, TLNuTool } from '~nu-lib'
import { TLNuState } from './TLNuState'

export interface TLNuToolStateClass<
  R extends TLNuApp<any> = TLNuApp<any>,
  P extends TLNuTool<R> = TLNuTool<R>
> {
  new (tool: P, app: R): TLNuToolState<R, P>
  id: string
}

export abstract class TLNuToolState<
  R extends TLNuApp<any> = TLNuApp<any>,
  P extends TLNuTool<R> = any
> extends TLNuState<R, P> {
  get app() {
    return this.root
  }

  get tool() {
    return this.parent
  }
}
