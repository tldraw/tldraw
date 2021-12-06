import { TLNuDrawShape, TLNuState } from '~nu-lib'
import type { TLNuPointerHandler, TLNuShortcut } from '~types'

export class IdleState<S extends TLNuDrawShape<any>> extends TLNuState<S> {
  static id = 'idle'

  shortcuts: TLNuShortcut[] = [
    {
      keys: 'cmd+a,ctrl+a',
      fn: () => {
        this.app.selectTool('select')
        this.app.selectAll()
      },
    },
  ]

  onPointerDown: TLNuPointerHandler<S> = (info, e) => {
    if (info.order > 0) return
    this.tool.transition('pointing')
  }

  onPointerUp: TLNuPointerHandler<S> = () => {
    this.tool.transition('idle')
    this.app.selectTool('select')
  }
}
