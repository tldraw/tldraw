import { IdleState, PointingState, CreatingState } from './states'
import { TLNuApp, TLNuDrawShape, TLNuDrawShapeProps, TLNuShapeProps, TLNuTool } from '~nu-lib'

export abstract class TLNuDrawTool<S extends TLNuDrawShape<any>> extends TLNuTool<S> {
  constructor(app: TLNuApp<S>) {
    super(app)
    this.registerStates(IdleState, PointingState, CreatingState)
    this.transition('idle')
  }

  abstract shapeClass: {
    new (props: TLNuShapeProps & Partial<TLNuDrawShapeProps & unknown>): S
  }

  onEnter = () => this.transition('idle')
}
