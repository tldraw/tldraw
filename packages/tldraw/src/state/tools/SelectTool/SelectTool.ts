import {
  TLBoundsCorner,
  TLBoundsEdge,
  TLBoundsEventHandler,
  TLBoundsHandleEventHandler,
  TLCanvasEventHandler,
  TLPointerEventHandler,
  TLKeyboardEventHandler,
  TLShapeCloneHandler,
  Utils,
} from '@tldraw/core'
import { SessionType, TLDrawShapeType } from '~types'
import { BaseTool } from '../BaseTool'
import Vec from '@tldraw/vec'
import { TLDR } from '~state/TLDR'
import { CLONING_DISTANCE } from '~constants'

enum Status {
  Idle = 'idle',
  Creating = 'creating',
  Pinching = 'pinching',
  PointingCanvas = 'pointingCanvas',
  PointingHandle = 'pointingHandle',
  PointingBounds = 'pointingBounds',
  PointingClone = 'pointingClone',
  TranslatingClone = 'translatingClone',
  PointingBoundsHandle = 'pointingBoundsHandle',
  TranslatingHandle = 'translatingHandle',
  Translating = 'translating',
  Transforming = 'transforming',
  Rotating = 'rotating',
  Brushing = 'brushing',
  GridCloning = 'gridCloning',
  ClonePainting = 'clonePainting',
  SpacePanning = 'spacePanning',
}

export class SelectTool extends BaseTool<Status> {
  type = 'select' as const

  pointedId?: string

  selectedGroupId?: string

  pointedHandleId?: 'start' | 'end' | 'bend'

  pointedBoundsHandle?: TLBoundsCorner | TLBoundsEdge | 'rotate' | 'center' | 'left' | 'right'

  pointedLinkHandleId?: 'left' | 'center' | 'right'

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

  private selectNone() {
    this.state.selectNone()
  }

  onEnter = () => {
    this.setStatus(Status.Idle)
  }

  onExit = () => {
    this.setStatus(Status.Idle)
  }

  clonePaint = (point: number[]) => {
    if (this.state.selectedIds.length === 0) return

    const shapes = this.state.selectedIds.map((id) => this.state.getShape(id))

    const bounds = Utils.expandBounds(Utils.getCommonBounds(shapes.map(TLDR.getBounds)), 16)

    const center = Utils.getBoundsCenter(bounds)

    const size = [bounds.width, bounds.height]

    const gridPoint = [
      center[0] + size[0] * Math.floor((point[0] + size[0] / 2 - center[0]) / size[0]),
      center[1] + size[1] * Math.floor((point[1] + size[1] / 2 - center[1]) / size[1]),
    ]

    const centeredBounds = Utils.centerBounds(bounds, gridPoint)

    const hit = this.state.shapes.some((shape) =>
      TLDR.getShapeUtils(shape).hitTestBounds(shape, centeredBounds)
    )

    if (!hit) {
      this.state.duplicate(this.state.selectedIds, gridPoint)
    }
  }

  getShapeClone = (
    id: string,
    side:
      | 'top'
      | 'right'
      | 'bottom'
      | 'left'
      | 'topLeft'
      | 'topRight'
      | 'bottomRight'
      | 'bottomLeft'
  ) => {
    const shape = this.state.getShape(id)

    const utils = TLDR.getShapeUtils(shape)

    if (utils.canClone) {
      const bounds = utils.getBounds(shape)

      const center = utils.getCenter(shape)

      let point = {
        top: [bounds.minX, bounds.minY - (bounds.height + CLONING_DISTANCE)],
        right: [bounds.maxX + CLONING_DISTANCE, bounds.minY],
        bottom: [bounds.minX, bounds.maxY + CLONING_DISTANCE],
        left: [bounds.minX - (bounds.width + CLONING_DISTANCE), bounds.minY],
        topLeft: [
          bounds.minX - (bounds.width + CLONING_DISTANCE),
          bounds.minY - (bounds.height + CLONING_DISTANCE),
        ],
        topRight: [
          bounds.maxX + CLONING_DISTANCE,
          bounds.minY - (bounds.height + CLONING_DISTANCE),
        ],
        bottomLeft: [
          bounds.minX - (bounds.width + CLONING_DISTANCE),
          bounds.maxY + CLONING_DISTANCE,
        ],
        bottomRight: [bounds.maxX + CLONING_DISTANCE, bounds.maxY + CLONING_DISTANCE],
      }[side]

      if (shape.rotation !== 0) {
        const newCenter = Vec.add(point, [bounds.width / 2, bounds.height / 2])

        const rotatedCenter = Vec.rotWith(newCenter, center, shape.rotation || 0)

        point = Vec.sub(rotatedCenter, [bounds.width / 2, bounds.height / 2])
      }

      const id = Utils.uniqueId()

      const clone = {
        ...shape,
        id,
        point,
      }

      if (clone.type === TLDrawShapeType.Sticky) {
        clone.text = ''
      }

      return clone
    }

    return
  }

  /* ----------------- Event Handlers ----------------- */

  onCancel = () => {
    this.selectNone()
    this.state.cancelSession()
    this.setStatus(Status.Idle)
  }

  onKeyDown: TLKeyboardEventHandler = (key, info) => {
    if (key === 'Escape') {
      this.onCancel()
      return
    }

    if (key === ' ' && this.status === Status.Idle) {
      this.setStatus(Status.SpacePanning)
    }

    if (key === 'Tab') {
      if (this.status === Status.Idle && this.state.selectedIds.length === 1) {
        const [selectedId] = this.state.selectedIds

        const clonedShape = this.getShapeClone(selectedId, 'right')

        if (clonedShape) {
          this.state.createShapes(clonedShape)

          this.setStatus(Status.Idle)
          this.state.setEditingId(clonedShape.id)
          this.state.select(clonedShape.id)
        }
      }

      return
    }

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
    if (this.status === Status.ClonePainting && !(info.altKey && info.shiftKey)) {
      this.setStatus(Status.Idle)
      return
    }

    if (this.status === Status.SpacePanning && key === ' ') {
      this.setStatus(Status.Idle)
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

  // Keyup is handled on BaseTool

  // Pointer Events (generic)

  onPointerMove: TLPointerEventHandler = (info, e) => {
    const point = this.state.getPagePoint(info.origin)

    if (this.status === Status.SpacePanning && e.buttons === 1) {
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
        } else if (
          this.pointedBoundsHandle === 'center' ||
          this.pointedBoundsHandle === 'left' ||
          this.pointedBoundsHandle === 'right'
        ) {
          const point = this.state.getPagePoint(info.origin)
          this.setStatus(Status.Translating)
          this.state.startSession(SessionType.Translate, point, false, this.pointedBoundsHandle)
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

        // Also update the session with the current point
        this.state.updateSession(
          this.state.getPagePoint(info.point),
          info.shiftKey,
          info.altKey,
          info.metaKey
        )
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

    if (this.status === Status.PointingClone) {
      if (Vec.dist(info.origin, info.point) > 4) {
        this.setStatus(Status.TranslatingClone)
        const point = this.state.getPagePoint(info.origin)
        this.state.startSession(SessionType.Translate, point, true)
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

        const point = this.state.getPagePoint(info.point)

        if (this.pointedHandleId === 'bend') {
          this.state.startSession(SessionType.Handle, point, this.pointedHandleId)
        } else {
          this.state.startSession(SessionType.Arrow, point, this.pointedHandleId, false)
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

    if (this.status === Status.ClonePainting) {
      const point = this.state.getPagePoint(info.point)
      this.clonePaint(point)
    }

    return
  }

  onPointerDown: TLPointerEventHandler = () => {
    if (this.state.appState.isStyleOpen) {
      this.state.toggleStylePanel()
    }
  }

  onPointerUp: TLPointerEventHandler = (info) => {
    if (this.status === Status.TranslatingClone || this.status === Status.PointingClone) {
      if (this.pointedId) {
        this.state.completeSession()
        this.state.setEditingId(this.pointedId)
      }
      this.setStatus(Status.Idle)
      this.pointedId = undefined
      return
    }

    if (this.status === Status.PointingBounds) {
      if (info.target === 'bounds') {
        // If we just clicked the selecting bounds's background,
        // clear the selection
        this.selectNone()
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

  onPointCanvas: TLCanvasEventHandler = (info, e) => {
    if (info.spaceKey && e.buttons === 1) {
      return
    }

    if (this.status === Status.Idle && info.altKey && info.shiftKey) {
      this.setStatus(Status.ClonePainting)
      const point = this.state.getPagePoint(info.point)
      this.clonePaint(point)
      return
    }

    // Unless the user is holding shift or meta, clear the current selection
    if (!info.shiftKey) {
      if (this.state.pageState.editingId) {
        this.state.setEditingId()
      }

      if (info.altKey && this.state.selectedIds.length > 0) {
        this.state.duplicate(this.state.selectedIds, this.state.getPagePoint(info.point))
        return
      }

      this.selectNone()
    }

    this.setStatus(Status.PointingCanvas)
  }

  onDoubleClickCanvas: TLCanvasEventHandler = () => {
    // Not working on mobile
    // const pagePoint = this.state.getPagePoint(info.point)
    // this.state.selectTool(TLDrawShapeType.Text)
    // this.setStatus(Status.Idle)
    // this.state.createTextShapeAtPoint(pagePoint)
  }

  // Shape

  onPointShape: TLPointerEventHandler = (info, e) => {
    if (info.spaceKey && e.buttons === 1) {
      return
    }

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
          this.selectNone()
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
    const shape = this.state.getShape(info.target)

    // If we can edit the shape (and if we can select the shape) then
    // start editing
    if (
      TLDR.getShapeUtils(shape.type).canEdit &&
      (shape.parentId === this.state.currentPageId || shape.parentId === this.selectedGroupId)
    ) {
      this.state.setEditingId(info.target)
    }

    // If the shape is the child of a group, then drill into the group?
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
        this.selectNone()
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

  onDoubleClickBoundsHandle: TLBoundsHandleEventHandler = (info) => {
    if (info.target === 'center' || info.target === 'left' || info.target === 'right') {
      this.state.select(
        ...TLDR.getLinkedShapes(
          this.state.state,
          this.state.currentPageId,
          info.target,
          info.shiftKey
        )
      )
    }

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

  /* ---------------------- Misc ---------------------- */

  onShapeClone: TLShapeCloneHandler = (info) => {
    const selectedShapeId = this.state.selectedIds[0]

    const clonedShape = this.getShapeClone(selectedShapeId, info.target)

    if (
      info.target === 'left' ||
      info.target === 'right' ||
      info.target === 'top' ||
      info.target === 'bottom'
    ) {
      if (clonedShape) {
        this.state.createShapes(clonedShape)

        // Now start pointing the bounds, so that a user can start
        // dragging to reposition if they wish.
        this.pointedId = clonedShape.id
        this.setStatus(Status.PointingClone)
      }
    } else {
      const point = this.state.getPagePoint(info.point)
      this.setStatus(Status.GridCloning)
      this.state.startSession(SessionType.Grid, selectedShapeId, this.state.currentPageId, point)
    }
  }
}
