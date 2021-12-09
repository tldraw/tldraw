import type { TLNuApp, TLNuShape } from '~nu-lib'
import type { TLNuBinding } from '~types'
import { TLNuState } from './TLNuState'

export interface TLNuToolClass<R extends TLNuApp<any> = TLNuApp<any>> {
  new (parent: R, app: R): TLNuTool<R>
  id: string
}

export abstract class TLNuTool<R extends TLNuApp<any> = TLNuApp<any>> extends TLNuState<R, R> {
  get app() {
    return this.root
  }
}
