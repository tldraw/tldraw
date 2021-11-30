import { makeObservable, observable } from 'mobx'
import * as React from 'react'
import { TLNuApp, TLNuShape, TLNuState, TLNuTool, TLNuToolComponentProps } from '~nu-lib'
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
} from './states'

export class TLNuSelectTool<S extends TLNuShape, B extends TLNuBinding> extends TLNuTool<S, B> {
  constructor(app: TLNuApp<S, B>) {
    super(app)
    makeObservable(this)
  }

  readonly id = 'select'

  readonly label = 'Select'

  readonly shortcut = '1'

  readonly Component = ({ isActive }: TLNuToolComponentProps) => {
    return <span style={{ fontWeight: isActive ? '600' : '500' }}>S</span>
  }

  readonly states: TLNuState<S, B>[] = [
    new IdleState(this),
    new BrushingState(this),
    new PointingCanvasState(this),
    new PointingShapeState(this),
    new PointingSelectedShapeState(this),
    new PointingBoundsBackgroundState(this),
    new TranslatingShapesState(this),
    new PointingResizeHandleState(this),
    new ResizingShapesState(this),
  ]

  @observable currentState = this.states[0]

  onEnter = () => this.transition('idle')
}
