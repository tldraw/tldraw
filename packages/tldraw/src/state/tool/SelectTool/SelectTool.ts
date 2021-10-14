import {
  TLBoundsCorner,
  TLBoundsEdge,
  TLBoundsEventHandler,
  TLBoundsHandleEventHandler,
  TLCanvasEventHandler,
  TLPointerEventHandler,
  TLPinchEventHandler,
  TLKeyboardEventHandler,
  Utils,
} from '@tldraw/core'
import { SessionType, TLDrawShapeType } from '~types'
import { BaseTool } from '../BaseTool'
import Vec from '@tldraw/vec'
import { TLDR } from '~state/tldr'

enum Status {
  Idle = 'idle',
  PointingCanvas = 'pointingCanvas',
  PointingHandle = 'pointingHandle',
  PointingBounds = 'pointingBounds',
  PointingBoundsHandle = 'pointingBoundsHandle',
  TranslatingHandle = 'translatingHandle',
  Translating = 'translating',
  Transforming = 'transforming',
  Rotating = 'rotating',
  Pinching = 'pinching',
  Brushing = 'brushing',
}

export class SelectTool extends BaseTool {
  type = 'select' as const

  status: Status = Status.Idle

  pointedId?: string

  selectedGroupId?: string

  pointedHandleId?: 'start' | 'end'

  pointedBoundsHandle?: TLBoundsCorner | TLBoundsEdge | 'rotate'

  /* --------------------- Methods -------------------- */

  private deselect(id: string) {
    this.state.select(...this.state.selectedIds.filter((oid) => oid !== id))
  }

  private select(id: string) {
    this.state.select(id)
  }

  private pushSelect(id: string) {
    const shape = this.state.getShape(id)
    this.state.select(...this.state.selectedIds.filter((oid) => oid !== shape.parentId), id)
  }

  private deselectAll() {
    this.state.deselectAll()
  }

  onEnter = () => {
    this.setStatus(Status.Idle)
  }

  onExit = () => {
    this.setStatus(Status.Idle)
  }

  /* ----------------- Event Handlers ----------------- */

  onCancel = () => {
    this.deselectAll()
    // TODO: Make all cancel sessions have no arguments
    this.state.cancelSession()
    this.setStatus(Status.Idle)
  }

  onKeyDown: TLKeyboardEventHandler = (key, info) => {
    if (key === 'Escape') {
      this.onCancel()
      return
    }

    if (key === 'Meta' || key === 'Control') {
      // TODO: Make all sessions have all of these arguments
      this.state.updateSession(
        this.state.getPagePoint(info.point),
        info.shiftKey,
        info.altKey,
        info.metaKey
      )
      return
    }
  }

  onKeyUp: TLKeyboardEventHandler = () => {
    /* noop */
  }

  // Pointer Events (generic)

  onPointerMove: TLPointerEventHandler = (info, e) => {
    const point = this.state.getPagePoint(info.origin)

    if (info.spaceKey && e.buttons === 1) {
      this.state.onPan?.({ ...info, delta: Vec.neg(info.delta) }, e as unknown as WheelEvent)
      return
    }

    if (this.status === Status.PointingBoundsHandle) {
      if (!this.pointedBoundsHandle) throw Error('No pointed bounds handle')
      if (Vec.dist(info.origin, info.point) > 4) {
        if (this.pointedBoundsHandle === 'rotate') {
          // Stat a rotate session
          this.setStatus(Status.Rotating)

          this.state.startSession(SessionType.Rotate, point)
        } else {
          // Stat a transform session
          this.setStatus(Status.Transforming)

          const idsToTransform = this.state.selectedIds.flatMap((id) =>
            TLDR.getDocumentBranch(this.state.state, id, this.state.currentPageId)
          )

          if (idsToTransform.length === 1) {
            // if only one shape is selected, transform single
            this.state.startSession(SessionType.TransformSingle, point, this.pointedBoundsHandle)
          } else {
            // otherwise, transform
            this.state.startSession(SessionType.Transform, point, this.pointedBoundsHandle)
          }
        }
      }
      return
    }

    if (this.status === Status.PointingCanvas) {
      if (Vec.dist(info.origin, info.point) > 4) {
        const point = this.state.getPagePoint(info.point)
        this.state.startSession(SessionType.Brush, point)
        this.setStatus(Status.Brushing)
      }
      return
    }

    if (this.status === Status.PointingBounds) {
      if (Vec.dist(info.origin, info.point) > 4) {
        this.setStatus(Status.Translating)
        const point = this.state.getPagePoint(info.origin)
        this.state.startSession(SessionType.Translate, point)
      }
      return
    }

    if (this.status === Status.PointingHandle) {
      if (!this.pointedHandleId) throw Error('No pointed handle')
      if (Vec.dist(info.origin, info.point) > 4) {
        this.setStatus(Status.TranslatingHandle)

        const selectedShape = this.state.getShape(this.state.selectedIds[0])

        if (!selectedShape) return

        const point = this.state.getPagePoint(info.origin)

        if (selectedShape.type === TLDrawShapeType.Arrow) {
          this.state.startSession(SessionType.Arrow, point, this.pointedHandleId)
        } else {
          this.state.startSession(SessionType.Handle, point, this.pointedHandleId)
        }
      }
      return
    }

    if (this.state.session) {
      return this.state.updateSession(
        this.state.getPagePoint(info.point),
        info.shiftKey,
        info.altKey,
        info.metaKey
      )
    }

    return
  }

  onPointerDown: TLPointerEventHandler = () => {
    if (this.state.appState.isStyleOpen) {
      this.state.toggleStylePanel()
    }
  }

  onPointerUp: TLPointerEventHandler = (info) => {
    if (this.status === Status.PointingBounds) {
      if (info.target === 'bounds') {
        // If we just clicked the selecting bounds's background,
        // clear the selection
        this.deselectAll()
      } else if (this.state.isSelected(info.target)) {
        // If we're holding shift...
        if (info.shiftKey) {
          // unless we just shift-selected the shape, remove it from
          // the selected shapes
          if (this.pointedId !== info.target) {
            this.deselect(info.target)
          }
        } else {
          // If we have other selected shapes, select this one instead
          if (this.pointedId !== info.target && this.state.selectedIds.length > 1) {
            this.select(info.target)
          }
        }
      } else if (this.pointedId === info.target) {
        // If the target is not selected and was just pointed
        // on pointer down...
        if (info.shiftKey) {
          this.pushSelect(info.target)
        } else {
          this.select(info.target)
        }
      }
    }

    // Complete the current session, if any; and reset the status
    this.state.completeSession()
    this.setStatus(Status.Idle)
    this.pointedBoundsHandle = undefined
    this.pointedHandleId = undefined
    this.pointedId = undefined
  }

  // Canvas

  onPointCanvas: TLCanvasEventHandler = (info) => {
    // Unless the user is holding shift or meta, clear the current selection
    if (!info.shiftKey) {
      this.deselectAll()
      if (this.state.pageState.editingId) {
        this.state.setEditingId()
      }
    }

    this.setStatus(Status.PointingCanvas)
  }

  onDoubleClickCanvas: TLCanvasEventHandler = (info) => {
    const pagePoint = this.state.getPagePoint(info.point)
    this.state.selectTool(TLDrawShapeType.Text)
    const tool = this.state.tools[TLDrawShapeType.Text]
    this.setStatus(Status.Idle)
    tool.createTextShapeAtPoint(pagePoint)
  }

  // Shape

  onPointShape: TLPointerEventHandler = (info) => {
    const { hoveredId } = this.state.pageState

    // While holding command and shift, select or deselect
    // the shape, ignoring any group that may contain it. Yikes!
    if (
      (this.status === Status.Idle || this.status === Status.PointingBounds) &&
      info.metaKey &&
      info.shiftKey &&
      hoveredId
    ) {
      this.pointedId = hoveredId

      if (this.state.isSelected(hoveredId)) {
        this.deselect(hoveredId)
      } else {
        this.pushSelect(hoveredId)
        this.setStatus(Status.PointingBounds)
      }

      return
    }

    if (this.status === Status.PointingBounds) {
      // The pointed id should be the shape's group, if it belongs
      // to a group, or else the shape itself, if it is on the page.
      const { parentId } = this.state.getShape(info.target)
      this.pointedId = parentId === this.state.currentPageId ? info.target : parentId
      return
    }

    if (this.status === Status.Idle) {
      this.setStatus(Status.PointingBounds)

      if (info.metaKey) {
        if (!info.shiftKey) {
          this.deselectAll()
        }

        const point = this.state.getPagePoint(info.point)
        this.state.startSession(SessionType.Brush, point)

        this.setStatus(Status.Brushing)
        return
      }

      // If we've clicked on a shape that is inside of a group,
      // then select the group rather than the shape.
      let shapeIdToSelect: string
      const { parentId } = this.state.getShape(info.target)

      // If the pointed shape is a child of the page, select the
      // target shape and clear the selected group id.
      if (parentId === this.state.currentPageId) {
        shapeIdToSelect = info.target
        this.selectedGroupId = undefined
      } else {
        // If the parent is some other group...
        if (parentId === this.selectedGroupId) {
          // If that group is the selected group, then select
          // the target shape.
          shapeIdToSelect = info.target
        } else {
          // Otherwise, select the group and clear the selected
          // group id.
          shapeIdToSelect = parentId

          this.selectedGroupId = undefined
        }
      }

      if (!this.state.isSelected(shapeIdToSelect)) {
        // Set the pointed ID to the shape that was clicked.
        this.pointedId = shapeIdToSelect

        // If the shape is not selected: then if the user is pressing shift,
        // add the shape to the current selection; otherwise, set the shape as
        // the only selected shape.
        if (info.shiftKey) {
          this.pushSelect(shapeIdToSelect)
        } else {
          this.select(shapeIdToSelect)
        }
      }
    }
  }

  onDoubleClickShape: TLPointerEventHandler = (info) => {
    // if (this.status !== Status.Idle) return

    const shape = this.state.getShape(info.target)

    const utils = TLDR.getShapeUtils(shape.type)

    if (utils.canEdit) {
      this.state.setEditingId(info.target)
      // this.state.startTextSession(info.target)
    }

    // If the shape is the child of a group, then drill
    // into the group?
    if (shape.parentId !== this.state.currentPageId) {
      this.selectedGroupId = shape.parentId
    }

    this.state.select(info.target)
  }

  onRightPointShape: TLPointerEventHandler = (info) => {
    if (!this.state.isSelected(info.target)) {
      this.state.select(info.target)
    }
  }

  onHoverShape: TLPointerEventHandler = (info) => {
    this.state.setHoveredId(info.target)
  }

  onUnhoverShape: TLPointerEventHandler = (info) => {
    const { currentPageId: oldCurrentPageId } = this.state

    // Wait a frame; and if we haven't changed the hovered id,
    // clear the current hovered id
    requestAnimationFrame(() => {
      if (
        oldCurrentPageId === this.state.currentPageId &&
        this.state.pageState.hoveredId === info.target
      ) {
        this.state.setHoveredId(undefined)
      }
    })
  }

  /* --------------------- Bounds --------------------- */

  onPointBounds: TLBoundsEventHandler = (info) => {
    if (info.metaKey) {
      if (!info.shiftKey) {
        this.deselectAll()
      }

      const point = this.state.getPagePoint(info.point)
      this.state.startSession(SessionType.Brush, point)

      this.setStatus(Status.Brushing)
      return
    }

    this.setStatus(Status.PointingBounds)
  }

  onReleaseBounds: TLBoundsEventHandler = () => {
    if (this.status === Status.Translating || this.status === Status.Brushing) {
      this.state.completeSession()
    }

    this.setStatus(Status.Idle)
  }

  /* ----------------- Bounds Handles ----------------- */

  onPointBoundsHandle: TLBoundsHandleEventHandler = (info) => {
    this.pointedBoundsHandle = info.target
    this.setStatus(Status.PointingBoundsHandle)
  }

  onDoubleClickBoundsHandle: TLBoundsHandleEventHandler = () => {
    if (this.state.selectedIds.length === 1) {
      this.state.resetBounds(this.state.selectedIds)
    }
  }

  onReleaseBoundsHandle: TLBoundsHandleEventHandler = () => {
    this.setStatus(Status.Idle)
  }

  /* --------------------- Handles -------------------- */

  onPointHandle: TLPointerEventHandler = (info) => {
    this.pointedHandleId = info.target as 'start' | 'end'
    this.setStatus(Status.PointingHandle)
  }

  onDoubleClickHandle: TLPointerEventHandler = (info) => {
    this.state.toggleDecoration(info.target)
  }

  onReleaseHandle: TLPointerEventHandler = () => {
    this.setStatus(Status.Idle)
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
    if (this.status !== Status.Pinching) return
    this.state.pinchZoom(info.point, info.delta, info.delta[2])
    this.onPointerMove(info, e as unknown as React.PointerEvent)
  }
}
