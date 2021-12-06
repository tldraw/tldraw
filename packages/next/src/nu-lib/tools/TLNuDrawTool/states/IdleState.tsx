import { TLNuDrawShape, TLNuState } from '~nu-lib'
import type { TLNuPointerHandler } from '~types'

export class IdleState<S extends TLNuDrawShape<any>> extends TLNuState<S> {
  static id = 'idle'

  onPointerDown: TLNuPointerHandler<S> = (info, e) => {
    if (info.order > 0) return
    this.tool.transition('pointing')
  }

  onPointerUp: TLNuPointerHandler<S> = () => {
    this.tool.transition('idle')
    this.app.selectTool('select')
  }
}
