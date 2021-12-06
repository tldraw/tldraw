import * as React from 'react'
import { TLNuApp, TLNuShape, TLNuTool, TLNuToolComponentProps } from '~nu-lib'
import type { TLNuBinding } from '~types'
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

export class TLNuSelectTool<S extends TLNuShape, B extends TLNuBinding> extends TLNuTool<S, B> {
  constructor(app: TLNuApp<S, B>) {
    super(app)
    this.registerStates(
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
      PinchingState
    )
    this.transition('idle')
  }

  static id = 'select'

  label = 'Select'
  shortcut = 'v,1'

  readonly Component = ({ isActive }: TLNuToolComponentProps) => {
    return <span style={{ fontWeight: isActive ? '600' : '500' }}>S</span>
  }

  onEnter = () => this.transition('idle')
}
