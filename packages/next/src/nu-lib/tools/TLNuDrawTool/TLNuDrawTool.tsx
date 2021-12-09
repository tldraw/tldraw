import { IdleState, PointingState, CreatingState } from './states'
import { TLNuTool } from '~nu-lib'
import type { TLNuApp, TLNuDrawShape, TLNuDrawShapeProps, TLNuShapeProps, TLNuShape } from '~nu-lib'

export abstract class TLNuDrawTool<
  T extends TLNuDrawShape = TLNuDrawShape,
  S extends TLNuShape = TLNuShape,
  R extends TLNuApp<S> = TLNuApp<S>
> extends TLNuTool<S, R> {
  static id = 'draw'

  static states = [IdleState, PointingState, CreatingState]

  static initial = 'idle'

  /** Whether to simplify the shape's points after creating. */
  simplify = true

  /** The minimum distance between points when simplifying a line. */
  simplifyTolerance = 1

  abstract shapeClass: {
    new (props: TLNuShapeProps & Partial<TLNuDrawShapeProps & unknown>): T
  }
}
