import {
  ArrowBinding,
  ArrowShape,
  TDShape,
  TDBinding,
  TDStatus,
  SessionType,
  TDShapeType,
  TldrawPatch,
  TldrawCommand,
} from '~types'
import { Vec } from '@tldraw/vec'
import { Utils } from '@tldraw/core'
import { TLDR } from '~state/TLDR'
import { BINDING_DISTANCE } from '~constants'
import { shapeUtils } from '~state/shapes'
import { BaseSession } from '../BaseSession'
import type { TldrawApp } from '../../internal'

export class ArrowSession extends BaseSession {
  type = SessionType.Arrow
  status = TDStatus.TranslatingHandle
  newStartBindingId = Utils.uniqueId()
  draggedBindingId = Utils.uniqueId()
  didBind = false
  initialShape: ArrowShape
  handleId: 'start' | 'end'
  bindableShapeIds: string[]
  initialBinding?: TDBinding
  startBindingShapeId?: string
  isCreate: boolean

  constructor(app: TldrawApp, shapeId: string, handleId: 'start' | 'end', isCreate = false) {
    super(app)
    this.isCreate = isCreate
    const { currentPageId } = app.state.appState
    const page = app.state.document.pages[currentPageId]
    this.handleId = handleId
    this.initialShape = page.shapes[shapeId] as ArrowShape
    this.bindableShapeIds = TLDR.getBindableShapeIds(app.state).filter(
      (id) => !(id === this.initialShape.id || id === this.initialShape.parentId)
    )

    const { originPoint } = this.app

    if (this.isCreate) {
      // If we're creating a new shape, should we bind its first point?
      // The method may return undefined, which is correct if there is no
      // bindable shape under the pointer.
      this.startBindingShapeId = this.bindableShapeIds
        .map((id) => page.shapes[id])
        .find((shape) =>
          Utils.pointInBounds(originPoint, TLDR.getShapeUtil(shape).getBounds(shape))
        )?.id
    } else {
      // If we're editing an existing line, is there a binding already
      // for the dragging handle?
      const initialBindingId = this.initialShape.handles[this.handleId].bindingId

      if (initialBindingId) {
        this.initialBinding = page.bindings[initialBindingId]
      } else {
        // If not, explicitly set this handle to undefined, so that it gets deleted on undo
        this.initialShape.handles[this.handleId].bindingId = undefined
      }
    }
  }

  start = (): TldrawPatch | undefined => void null

  update = (): TldrawPatch | undefined => {
    const { initialShape } = this
    const { currentPoint, shiftKey, altKey, metaKey } = this.app

    const shape = this.app.getShape<ArrowShape>(initialShape.id)

    if (shape.isLocked) return

    const handles = shape.handles

    const handleId = this.handleId as keyof typeof handles

    // If the handle can bind, then we need to search bindable shapes for
    // a binding.
    if (!handles[handleId].canBind) return

    // First update the handle's next point

    const delta = Vec.sub(currentPoint, handles[handleId].point)

    const handle = {
      ...handles[handleId],
      point: Vec.round(Vec.sub(Vec.add(handles[handleId].point, delta), shape.point)),
      bindingId: undefined,
    }

    const utils = shapeUtils[TDShapeType.Arrow]

    const change = utils.onHandleChange?.(
      shape,
      {
        [handleId]: handle,
      },
      { delta, shiftKey, altKey, metaKey }
    )

    // If the handle changed produced no change, bail here
    if (!change) return

    // If nothing changes, we want these to be the same object reference as
    // before. If it does change, we'll redefine this later on. And if we've
    // made it this far, the shape should be a new object reference that
    // incorporates the changes we've made due to the handle movement.
    const next: { shape: ArrowShape; bindings: Record<string, TDBinding | undefined> } = {
      shape: Utils.deepMerge(shape, change),
      bindings: {},
    }

    if (this.initialBinding) {
      next.bindings[this.initialBinding.id] = undefined
    }

    // START BINDING

    // If we have a start binding shape id, the recompute the binding
    // point based on the current end handle position
    if (this.startBindingShapeId) {
      let startBinding: ArrowBinding | undefined

      const target = this.app.page.shapes[this.startBindingShapeId]

      const targetUtils = TLDR.getShapeUtil(target)

      if (!metaKey) {
        const center = targetUtils.getCenter(target)
        const handle = next.shape.handles.start
        const rayPoint = Vec.add(handle.point, next.shape.point)
        const rayOrigin = center
        const rayDirection = Vec.uni(Vec.sub(rayPoint, rayOrigin))

        startBinding = this.findBindingPoint(
          shape,
          target,
          'start',
          this.newStartBindingId,
          center,
          rayOrigin,
          rayDirection,
          false
        )
      }

      if (startBinding) {
        this.didBind = true

        next.bindings[this.newStartBindingId] = startBinding

        next.shape.handles = {
          ...next.shape.handles,
          start: {
            ...next.shape.handles.start,
            bindingId: startBinding.id,
          },
        }

        const target = this.app.page.shapes[this.startBindingShapeId]

        const targetUtils = TLDR.getShapeUtil(target)

        const arrowChange = TLDR.getShapeUtil<ArrowShape>(next.shape.type).onBindingChange?.(
          next.shape,
          startBinding,
          target,
          targetUtils.getBounds(target),
          targetUtils.getCenter(target)
        )

        if (arrowChange) {
          Object.assign(next.shape, arrowChange)
        }
      } else {
        this.didBind = this.didBind || false

        if (this.app.page.bindings[this.newStartBindingId]) {
          next.bindings[this.newStartBindingId] = undefined
        }

        if (shape.handles.start.bindingId === this.newStartBindingId) {
          next.shape.handles = {
            ...next.shape.handles,
            start: {
              ...next.shape.handles.start,
              bindingId: undefined,
            },
          }
        }
      }
    }

    // DRAGGED POINT BINDING

    let draggedBinding: ArrowBinding | undefined

    if (!metaKey) {
      const handle = next.shape.handles[this.handleId]
      const oppositeHandle = next.shape.handles[this.handleId === 'start' ? 'end' : 'start']
      const rayOrigin = Vec.add(oppositeHandle.point, next.shape.point)
      const rayPoint = Vec.add(handle.point, next.shape.point)
      const rayDirection = Vec.uni(Vec.sub(rayPoint, rayOrigin))

      const targets = this.bindableShapeIds.map((id) => this.app.page.shapes[id])

      for (const target of targets) {
        draggedBinding = this.findBindingPoint(
          shape,
          target,
          this.handleId,
          this.draggedBindingId,
          rayPoint,
          rayOrigin,
          rayDirection,
          altKey
        )

        if (draggedBinding) break
      }
    }

    if (draggedBinding) {
      this.didBind = true

      next.bindings[this.draggedBindingId] = draggedBinding

      next.shape.handles = {
        ...next.shape.handles,
        [this.handleId]: {
          ...next.shape.handles[this.handleId],
          bindingId: this.draggedBindingId,
        },
      }

      const target = this.app.page.shapes[draggedBinding.toId]

      const targetUtils = TLDR.getShapeUtil(target)

      const utils = shapeUtils[TDShapeType.Arrow]

      const arrowChange = utils.onBindingChange(
        next.shape,
        draggedBinding,
        target,
        targetUtils.getBounds(target),
        targetUtils.getCenter(target)
      )

      if (arrowChange) {
        Object.assign(next.shape, arrowChange)
      }
    } else {
      this.didBind = this.didBind || false

      const currentBindingId = shape.handles[this.handleId].bindingId

      if (currentBindingId) {
        next.bindings = {
          ...next.bindings,
          [currentBindingId]: undefined,
        }

        next.shape.handles = {
          ...next.shape.handles,
          [this.handleId]: {
            ...next.shape.handles[this.handleId],
            bindingId: undefined,
          },
        }
      }
    }

    return {
      document: {
        pages: {
          [this.app.currentPageId]: {
            shapes: {
              [shape.id]: next.shape,
            },
            bindings: next.bindings,
          },
        },
        pageStates: {
          [this.app.currentPageId]: {
            bindingId: next.shape.handles[handleId].bindingId,
          },
        },
      },
    }
  }

  cancel = (): TldrawPatch | undefined => {
    const { initialShape, initialBinding, newStartBindingId, draggedBindingId } = this

    const afterBindings: Record<string, TDBinding | undefined> = {}

    afterBindings[draggedBindingId] = undefined

    if (initialBinding) {
      afterBindings[initialBinding.id] = initialBinding
    }

    if (newStartBindingId) {
      afterBindings[newStartBindingId] = undefined
    }

    return {
      document: {
        pages: {
          [this.app.currentPageId]: {
            shapes: {
              [initialShape.id]: this.isCreate ? undefined : initialShape,
            },
            bindings: afterBindings,
          },
        },
        pageStates: {
          [this.app.currentPageId]: {
            selectedIds: this.isCreate ? [] : [initialShape.id],
            bindingId: undefined,
            hoveredId: undefined,
            editingId: undefined,
          },
        },
      },
    }
  }

  complete = (): TldrawPatch | TldrawCommand | undefined => {
    const { initialShape, initialBinding, newStartBindingId, startBindingShapeId, handleId } = this

    const beforeBindings: Partial<Record<string, TDBinding>> = {}

    const afterBindings: Partial<Record<string, TDBinding>> = {}

    let afterShape = this.app.page.shapes[initialShape.id] as ArrowShape

    const currentBindingId = afterShape.handles[handleId].bindingId

    if (initialBinding) {
      beforeBindings[initialBinding.id] = this.isCreate ? undefined : initialBinding
      afterBindings[initialBinding.id] = undefined
    }

    if (currentBindingId) {
      beforeBindings[currentBindingId] = undefined
      afterBindings[currentBindingId] = this.app.page.bindings[currentBindingId]
    }

    if (startBindingShapeId) {
      beforeBindings[newStartBindingId] = undefined
      afterBindings[newStartBindingId] = this.app.page.bindings[newStartBindingId]
    }

    afterShape = TLDR.onSessionComplete(afterShape)

    return {
      id: 'arrow',
      before: {
        document: {
          pages: {
            [this.app.currentPageId]: {
              shapes: {
                [initialShape.id]: this.isCreate ? undefined : initialShape,
              },
              bindings: beforeBindings,
            },
          },
          pageStates: {
            [this.app.currentPageId]: {
              selectedIds: this.isCreate ? [] : [initialShape.id],
              bindingId: undefined,
              hoveredId: undefined,
              editingId: undefined,
            },
          },
        },
      },
      after: {
        document: {
          pages: {
            [this.app.currentPageId]: {
              shapes: {
                [initialShape.id]: afterShape,
              },
              bindings: afterBindings,
            },
          },
          pageStates: {
            [this.app.currentPageId]: {
              selectedIds: [initialShape.id],
              bindingId: undefined,
              hoveredId: undefined,
              editingId: undefined,
            },
          },
        },
      },
    }
  }

  private findBindingPoint = (
    shape: ArrowShape,
    target: TDShape,
    handleId: 'start' | 'end',
    bindingId: string,
    point: number[],
    origin: number[],
    direction: number[],
    bindAnywhere: boolean
  ) => {
    const util = TLDR.getShapeUtil<TDShape>(target.type)

    const bindingPoint = util.getBindingPoint(
      target,
      shape,
      point,
      origin,
      direction,
      BINDING_DISTANCE,
      bindAnywhere
    )

    // Not all shapes will produce a binding point
    if (!bindingPoint) return

    return {
      id: bindingId,
      type: 'arrow',
      fromId: shape.id,
      toId: target.id,
      handleId: handleId,
      point: Vec.round(bindingPoint.point),
      distance: bindingPoint.distance,
    }
  }
}
