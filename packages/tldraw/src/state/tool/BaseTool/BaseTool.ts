import type {
  TLBoundsEventHandler,
  TLBoundsHandleEventHandler,
  TLCanvasEventHandler,
  TLKeyboardEventHandler,
  TLPinchEventHandler,
  TLPointerEventHandler,
  TLShapeBlurHandler,
  TLShapeCloneHandler,
  TLWheelEventHandler,
} from '~../../core/src/types'
import Utils from '~../../core/src/utils'
import type { TLDrawState } from '~state'
import type { TLDrawShapeType } from '~types'

export abstract class BaseTool {
  abstract type: TLDrawShapeType | 'select'

  state: TLDrawState

  status: string = 'idle' as const

  setStatus = (status: typeof this.status) => {
    this.status = status
    this.state.setStatus(this.status)
  }

  constructor(state: TLDrawState) {
    this.state = state
  }

  abstract onEnter: () => void

  abstract onExit: () => void

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

  onCancel = () => {
    if (this.status === 'creating') {
      this.state.cancelSession()
    }
  }

  // Keyboard events
  onKeyDown?: TLKeyboardEventHandler
  onKeyUp?: TLKeyboardEventHandler

  // Camera Events
  onPan?: TLWheelEventHandler
  onZoom?: TLWheelEventHandler

  // Pointer Events
  onPointerMove?: TLPointerEventHandler
  onPointerUp?: TLPointerEventHandler
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

  /* --------------------- Camera --------------------- */

  onPinchStart: TLPinchEventHandler = () => {
    this.state.cancelSession()
    this.setStatus('pinching')
  }

  onPinchEnd: TLPinchEventHandler = () => {
    if (Utils.isMobileSafari()) {
      this.state.undoSelect()
    }
    this.setStatus('idle')
  }

  onPinch: TLPinchEventHandler = (info, e) => {
    if (this.status !== 'pinching') return
    this.state.pinchZoom(info.point, info.delta, info.delta[2])
    this.onPointerMove?.(info, e as unknown as React.PointerEvent)
  }
}
