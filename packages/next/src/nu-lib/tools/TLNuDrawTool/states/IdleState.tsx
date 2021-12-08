import type { TLNuApp, TLNuDrawShape } from '~nu-lib'
import { TLNuToolState } from '../../../TLNuToolState'
import type { TLNuBinding, TLNuPinchHandler, TLNuPointerHandler, TLNuShortcut } from '~types'
import type { TLNuDrawTool } from '../../TLNuDrawTool'

export class IdleState<
  S extends TLNuDrawShape<any>,
  B extends TLNuBinding,
  R extends TLNuApp<S, B>,
  P extends TLNuDrawTool<S, B, R>
> extends TLNuToolState<S, B, R, P> {
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

  onPointerDown: TLNuPointerHandler<S> = (info, e) => {
    if (info.order > 0) return
    this.tool.transition('pointing')
  }

  onPinchStart: TLNuPinchHandler<S> = (...args) => {
    this.app.transition('select', { returnTo: 'draw' })
    this.app.onPinchStart?.(...args)
  }
}
