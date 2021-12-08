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
  R extends TLNuApp<any, any> = TLNuApp<any, any>
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
    new (app: TLNuApp<any, any>, props: TLNuShapeProps & Partial<TLNuDrawShapeProps & unknown>): S
  }
}
