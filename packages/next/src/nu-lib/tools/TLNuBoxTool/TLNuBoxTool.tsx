import { IdleState, PointingState, CreatingState } from './states'
import { TLNuApp, TLNuBoxShape, TLNuShapeProps, TLNuTool } from '~nu-lib'
import type { TLNuShortcut } from '~types'

export abstract class TLNuBoxTool<S extends TLNuBoxShape<any>> extends TLNuTool<S> {
  constructor(app: TLNuApp<S>) {
    super(app)
    this.registerStates(IdleState, PointingState, CreatingState)
    this.transition('idle')
  }

  static id = 'box'

  shortcuts: TLNuShortcut[] = [
    {
      keys: 'cmd+a,ctrl+a',
      fn: () => {
        this.app.selectTool('select')
        this.app.selectAll()
      },
    },
  ]

  abstract shapeClass: {
    new (props: TLNuShapeProps & Partial<any>): S
  }

  onEnter = () => this.transition('idle')
}
