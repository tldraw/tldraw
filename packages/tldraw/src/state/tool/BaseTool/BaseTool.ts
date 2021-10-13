import type {
  TLBoundsEventHandler,
  TLBoundsHandleEventHandler,
  TLCanvasEventHandler,
  TLKeyboardEventHandler,
  TLPinchEventHandler,
  TLPointerEventHandler,
  TLWheelEventHandler,
} from '~../../core/src/types'
import type { TLDrawState } from '~state'
import type { TLDrawShapeType } from '~types'

export abstract class BaseTool {
  abstract type: TLDrawShapeType | 'select'

  state: TLDrawState

  constructor(state: TLDrawState) {
    this.state = state
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

  onCancel?: () => void

  // Keyboard events
  onKeyDown?: TLKeyboardEventHandler
  onKeyUp?: TLKeyboardEventHandler

  // Camera Events
  onPinchStart?: TLPinchEventHandler
  onPinchEnd?: TLPinchEventHandler
  onPinch?: TLPinchEventHandler
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
  onShapeBlur?: () => void
}
