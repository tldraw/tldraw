import type { TLNuApp, TLNuBoxShape, TLNuBoxTool } from '~nu-lib'
import { TLNuToolState } from '../../../TLNuToolState'
import type { TLNuPinchHandler, TLNuPointerHandler, TLNuShortcut } from '~types'

export class IdleState<
  S extends TLNuBoxShape,
  R extends TLNuApp,
  P extends TLNuBoxTool<S, R>
> extends TLNuToolState<R, P> {
  static id = 'idle'

  static shortcuts: TLNuShortcut<TLNuApp>[] = [
    {
      keys: 'cmd+a,ctrl+a',
      fn: (app) => {
        app.transition('select')
        app.selectAll()
      },
    },
  ]

  onPointerDown: TLNuPointerHandler = (info, e) => {
    if (info.order > 0) return
    this.tool.transition('pointing')
  }

  onPinchStart: TLNuPinchHandler = (...args) => {
    this.app.transition('select', { returnTo: 'box' })
    this.app.onPinchStart?.(...args)
  }
}
