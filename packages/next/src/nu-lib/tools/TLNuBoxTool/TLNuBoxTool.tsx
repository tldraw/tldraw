import { IdleState, PointingState, CreatingState } from './states'
import { TLNuTool } from '~nu-lib'
import type { TLNuBinding, TLNuShortcut } from '~types'
import type { TLNuApp, TLNuBoxShape, TLNuShapeProps } from '~nu-lib'

export abstract class TLNuBoxTool<
  S extends TLNuBoxShape<any> = TLNuBoxShape<any>,
  B extends TLNuBinding = TLNuBinding,
  R extends TLNuApp<S, B> = TLNuApp<S, B>
> extends TLNuTool<S, B, R> {
  static id = 'box'

  static states = [IdleState, PointingState, CreatingState]

  static initial = 'idle'

  shortcuts: TLNuShortcut[] = [
    {
      keys: 'cmd+a,ctrl+a',
      fn: () => {
        this.app.transition('select')
        this.app.selectAll()
      },
    },
  ]

  abstract shapeClass: {
    new (app: R, props: TLNuShapeProps & Partial<any>): S
  }
}
