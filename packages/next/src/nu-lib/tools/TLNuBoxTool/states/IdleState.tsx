import type { TLNuApp, TLNuBoxShape, TLNuBoxTool } from '~nu-lib'
import { TLNuToolState } from '../../../TLNuToolState'
import type { TLNuBinding, TLNuPinchHandler, TLNuPointerHandler, TLNuShortcut } from '~types'

export class IdleState<
  S extends TLNuBoxShape<any>,
  B extends TLNuBinding,
  R extends TLNuApp<S, B>,
  P extends TLNuBoxTool<S, B, R>
> extends TLNuToolState<S, B, R, P> {
  static id = 'idle'

  shortcuts: TLNuShortcut[] = [
    {
      keys: 'cmd+a,ctrl+a',
      fn: () => {
        this.app.transition('select')
        this.app.selectAll()
      },
    },
  ]

  onPointerDown: TLNuPointerHandler<S> = (info, e) => {
    if (info.order > 0) return
    this.tool.transition('pointing')
  }

  onPinchStart: TLNuPinchHandler<S> = (...args) => {
    this.app.transition('select', { returnTo: 'box' })
    this.app.onPinchStart?.(...args)
  }
}
