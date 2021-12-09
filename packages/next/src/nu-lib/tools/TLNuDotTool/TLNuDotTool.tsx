import { IdleState, PointingState, CreatingState } from './states'
import { TLNuTool } from '~nu-lib'
import type { TLNuShortcut } from '~types'
import type { TLNuDotShapeProps, TLNuApp, TLNuShape, TLNuDotShape, TLNuShapeProps } from '~nu-lib'

// shape tools need to have two generics: a union of all shapes in
// the app, and the particular shape that they'll be creating

export abstract class TLNuDotTool<
  T extends TLNuDotShape = TLNuDotShape,
  S extends TLNuShape = TLNuShape,
  R extends TLNuApp<S> = TLNuApp<S>
> extends TLNuTool<R> {
  static id = 'box'

  static states = [IdleState, PointingState, CreatingState]

  static initial = 'idle'

  static shortcuts: TLNuShortcut<TLNuApp>[] = [
    {
      keys: 'cmd+a,ctrl+a',
      fn: (app) => {
        app.transition('select')
        app.selectAll()
      },
    },
  ]

  abstract shapeClass: {
    new (props: TLNuShapeProps & Partial<TLNuDotShapeProps & unknown>): T
  }
}
