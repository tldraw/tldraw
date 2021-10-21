import Vec from '@tldraw/vec'
import {
  TLBoundsEventHandler,
  TLBoundsHandleEventHandler,
  TLCanvasEventHandler,
  TLKeyboardEventHandler,
  TLPinchEventHandler,
  TLPointerEventHandler,
  TLShapeBlurHandler,
  TLShapeCloneHandler,
  TLWheelEventHandler,
  Utils,
} from '@tldraw/core'
import type { TLDrawState } from '~state'
import type { TLDrawShapeType } from '~types'

export enum Status {
  Idle = 'idle',
  Creating = 'creating',
  Pinching = 'pinching',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export abstract class BaseTool<T extends string = any> {
  abstract type: TLDrawShapeType | 'select'

  state: TLDrawState

  status: Status | T = Status.Idle

  constructor(state: TLDrawState) {
    this.state = state
  }

  protected readonly setStatus = (status: Status | T) => {
    this.status = status as Status | T
    this.state.setStatus(this.status as string)
  }

  onEnter = () => {
    this.setStatus(Status.Idle)
  }

  onExit = () => {
    this.setStatus(Status.Idle)
  }

  onCancel = () => {
    this.state.cancelSession()
    if (this.status === Status.Idle) {
      this.state.selectTool('select')
    } else {
      this.setStatus(Status.Idle)
    }
  }

  getNextChildIndex = () => {
    const {
      shapes,
      appState: { currentPageId },
    } = this.state

    return shapes.length === 0
      ? 1
      : shapes
          .filter((shape) => shape.parentId === currentPageId)
          .sort((a, b) => b.childIndex - a.childIndex)[0].childIndex + 1
  }

  /* --------------------- Camera --------------------- */

  onPinchStart: TLPinchEventHandler = () => {
    this.state.cancelSession()
    this.setStatus(Status.Pinching)
  }

  onPinchEnd: TLPinchEventHandler = () => {
    if (Utils.isMobileSafari()) {
      this.state.undoSelect()
    }
    this.setStatus(Status.Idle)
  }

  onPinch: TLPinchEventHandler = (info, e) => {
    if (this.status !== 'pinching') return
    this.state.pinchZoom(info.point, info.delta, info.delta[2])
    this.onPointerMove?.(info, e as unknown as React.PointerEvent)
  }

  /* ---------------------- Keys ---------------------- */

  onKeyDown: TLKeyboardEventHandler = (key, info) => {
    if (key === 'Escape') {
      this.onCancel()
      return
    }

    /* noop */
    if (key === 'Meta' || key === 'Control' || key === 'Alt') {
      this.state.updateSession(
        this.state.getPagePoint(info.point),
        info.shiftKey,
        info.altKey,
        info.metaKey
      )
      return
    }
  }

  onKeyUp: TLKeyboardEventHandler = (key, info) => {
    /* noop */
    if (key === 'Meta' || key === 'Control' || key === 'Alt') {
      this.state.updateSession(
        this.state.getPagePoint(info.point),
        info.shiftKey,
        info.altKey,
        info.metaKey
      )
      return
    }
  }

  /* --------------------- Pointer -------------------- */

  onPointerMove: TLPointerEventHandler = (info) => {
    if (this.status === Status.Creating) {
      const pagePoint = Vec.round(this.state.getPagePoint(info.point))
      this.state.updateSession(pagePoint, info.shiftKey, info.altKey, info.metaKey)
    }
  }

  onPointerUp: TLPointerEventHandler = () => {
    if (this.status === Status.Creating) {
      this.state.completeSession()
    }

    this.setStatus(Status.Idle)
  }

  /* --------------------- Others --------------------- */

  // Camera Events
  onPan?: TLWheelEventHandler
  onZoom?: TLWheelEventHandler

  // Pointer Events
  onPointerDown?: TLPointerEventHandler

  // Canvas (background)
  onPointCanvas?: TLCanvasEventHandler
  onDoubleClickCanvas?: TLCanvasEventHandler
  onRightPointCanvas?: TLCanvasEventHandler
  onDragCanvas?: TLCanvasEventHandler
  onReleaseCanvas?: TLCanvasEventHandler

  // Shape
  onPointShape?: TLPointerEventHandler
  onDoubleClickShape?: TLPointerEventHandler
  onRightPointShape?: TLPointerEventHandler
  onDragShape?: TLPointerEventHandler
  onHoverShape?: TLPointerEventHandler
  onUnhoverShape?: TLPointerEventHandler
  onReleaseShape?: TLPointerEventHandler

  // Bounds (bounding box background)
  onPointBounds?: TLBoundsEventHandler
  onDoubleClickBounds?: TLBoundsEventHandler
  onRightPointBounds?: TLBoundsEventHandler
  onDragBounds?: TLBoundsEventHandler
  onHoverBounds?: TLBoundsEventHandler
  onUnhoverBounds?: TLBoundsEventHandler
  onReleaseBounds?: TLBoundsEventHandler

  // Bounds handles (corners, edges)
  onPointBoundsHandle?: TLBoundsHandleEventHandler
  onDoubleClickBoundsHandle?: TLBoundsHandleEventHandler
  onRightPointBoundsHandle?: TLBoundsHandleEventHandler
  onDragBoundsHandle?: TLBoundsHandleEventHandler
  onHoverBoundsHandle?: TLBoundsHandleEventHandler
  onUnhoverBoundsHandle?: TLBoundsHandleEventHandler
  onReleaseBoundsHandle?: TLBoundsHandleEventHandler

  // Handles (ie the handles of a selected arrow)
  onPointHandle?: TLPointerEventHandler
  onDoubleClickHandle?: TLPointerEventHandler
  onRightPointHandle?: TLPointerEventHandler
  onDragHandle?: TLPointerEventHandler
  onHoverHandle?: TLPointerEventHandler
  onUnhoverHandle?: TLPointerEventHandler
  onReleaseHandle?: TLPointerEventHandler

  // Misc
  onShapeBlur?: TLShapeBlurHandler
  onShapeClone?: TLShapeCloneHandler
}
