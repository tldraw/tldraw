import { IdleState, PointingState, CreatingState } from './states'
import { TLNuApp, TLNuShape, TLNuTool } from '~nu-lib'

export abstract class TLNuBoxTool<S extends TLNuShape> extends TLNuTool<S> {
  constructor(app: TLNuApp<S>) {
    super(app)
    this.registerStates(IdleState, PointingState, CreatingState)
    this.transition('idle')
  }

  abstract shapeClass: {
    new (props: any): S
  }

  onEnter = () => this.transition('idle')
}
