/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TLNuApp, TLNuShape, TLNuTool } from '~nu-lib'
import type { TLNuBinding } from '~types'
import { TLNuState } from './TLNuState'

export interface TLNuToolStateClass<R extends TLNuApp = TLNuApp, P extends TLNuTool<R> = any> {
  new (tool: P, app: R): TLNuToolState<R, P>
  id: string
}

export abstract class TLNuToolState<
  R extends TLNuApp = TLNuApp,
  P extends TLNuTool<R> = any
> extends TLNuState<R, P> {
  get app() {
    return this.root
  }

  get tool() {
    return this.parent
  }
}
