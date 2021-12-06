import { TLNuBoxShape, TLNuState } from '~nu-lib'
import type { TLNuPinchHandler, TLNuPointerHandler, TLNuShortcut } from '~types'

export class IdleState<S extends TLNuBoxShape<any>> extends TLNuState<S> {
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

  onPinchStart: TLNuPinchHandler<S> = (...args) => {
    this.app.selectTool('select', { returnTo: 'box' })
    this.app.selectedTool.currentState.onPinchStart?.(...args)
  }
}
