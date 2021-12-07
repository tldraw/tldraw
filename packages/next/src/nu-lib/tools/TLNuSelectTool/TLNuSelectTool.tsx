import type { TLNuToolStateClass, TLNuApp, TLNuShape } from '~nu-lib'
import type { TLNuBinding } from '~types'
import { TLNuTool } from '../../TLNuTool'
import {
  IdleState,
  BrushingState,
  PointingShapeState,
  PointingCanvasState,
  PointingBoundsBackgroundState,
  TranslatingShapesState,
  PointingSelectedShapeState,
  PointingResizeHandleState,
  ResizingShapesState,
  RotatingShapesState,
  PointingRotateHandleState,
  PinchingState,
} from './states'

export class TLNuSelectTool<
  S extends TLNuShape = TLNuShape,
  B extends TLNuBinding = TLNuBinding,
  R extends TLNuApp<S, B> = TLNuApp<S, B>
> extends TLNuTool<S, B, R> {
  static id = 'select'

  static initial = 'idle'

  static shortcut = 'v,1'

  static states: TLNuToolStateClass[] = [
    IdleState,
    BrushingState,
    PointingCanvasState,
    PointingShapeState,
    PointingSelectedShapeState,
    PointingBoundsBackgroundState,
    TranslatingShapesState,
    PointingResizeHandleState,
    ResizingShapesState,
    PointingRotateHandleState,
    RotatingShapesState,
    RotatingShapesState,
    PinchingState,
  ]
}
