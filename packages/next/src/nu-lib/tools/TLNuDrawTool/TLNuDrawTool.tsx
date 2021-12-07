import { IdleState, PointingState, CreatingState } from './states'
import { TLNuTool } from '~nu-lib'
import type { TLNuBinding } from '~types'
import type {
  TLNuToolStateClass,
  TLNuApp,
  TLNuDrawShape,
  TLNuDrawShapeProps,
  TLNuShapeProps,
} from '~nu-lib'

export abstract class TLNuDrawTool<
  S extends TLNuDrawShape<any> = TLNuDrawShape<any>,
  B extends TLNuBinding = TLNuBinding,
  R extends TLNuApp<S, B> = TLNuApp<S, B>
> extends TLNuTool<S, B, R> {
  static id = 'draw'

  static states = [IdleState, PointingState, CreatingState]

  static initial = 'idle'

  /**
   * Whether to simplify the shape's points after creating.
   */
  simplify = true

  /**
   * The minimum distance between points when simplifying a line.
   */
  simplifyTolerance = 1

  abstract shapeClass: {
    new (app: R, props: TLNuShapeProps & Partial<TLNuDrawShapeProps & unknown>): S
  }
}
