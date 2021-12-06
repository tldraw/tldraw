import { IdleState, PointingState, CreatingState } from './states'
import { TLNuApp, TLNuDrawShape, TLNuDrawShapeProps, TLNuShapeProps, TLNuTool } from '~nu-lib'

export abstract class TLNuDrawTool<S extends TLNuDrawShape<any>> extends TLNuTool<S> {
  constructor(app: TLNuApp<S>) {
    super(app)
    this.registerStates(IdleState, PointingState, CreatingState)
    this.transition('idle')
  }

  static id = 'draw'

  /**
   * Whether to simplify the shape's points after creating.
   */
  simplify = true

  /**
   * The minimum distance between points when simplifying a line.
   */
  simplifyTolerance = 1

  abstract shapeClass: {
    new (props: TLNuShapeProps & Partial<TLNuDrawShapeProps & unknown>): S
  }

  onEnter = () => this.transition('idle')
}
