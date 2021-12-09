import type { TLNuToolStateClass, TLNuApp, TLNuShape } from '~nu-lib'
import type { TLNuBinding } from '~types'
import { TLNuTool } from '../../TLNuTool'
import {
  IdleState,
  BrushingState,
  PointingShapeState,
  PointingShapeBehindBoundsState,
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

export class TLNuSelectTool<R extends TLNuApp<any> = TLNuApp<any>> extends TLNuTool<R> {
  static id = 'select'

  static initial = 'idle'

  static shortcut = 'v,1'

  static states = [
    IdleState,
    BrushingState,
    PointingCanvasState,
    PointingShapeState,
    PointingShapeBehindBoundsState,
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
