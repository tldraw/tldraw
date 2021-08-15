import {
  ArrowBinding,
  ArrowShape,
  TLDrawShape,
  TLDrawBinding,
  Data,
  Session,
  TLDrawStatus,
} from '~types'
import { Vec, Utils } from '@tldraw/core'
import { TLDR } from '~state/tldr'

export class ArrowSession implements Session {
  id = 'transform_single'
  status = TLDrawStatus.TranslatingHandle
  newBindingId = Utils.uniqueId()
  delta = [0, 0]
  offset = [0, 0]
  origin: number[]
  initialShape: ArrowShape
  handleId: 'start' | 'end'
  bindableShapeIds: string[]
  initialBinding: TLDrawBinding | undefined
  didBind = false

  constructor(data: Data, handleId: 'start' | 'end', point: number[]) {
    const shapeId = data.pageState.selectedIds[0]
    this.origin = point
    this.handleId = handleId
    this.initialShape = TLDR.getShape<ArrowShape>(data, shapeId)
    this.bindableShapeIds = TLDR.getBindableShapeIds(data)

    const initialBindingId = this.initialShape.handles[this.handleId].bindingId

    if (initialBindingId) {
      this.initialBinding = data.page.bindings[initialBindingId]
    } else {
      // Explicitly set this handle to undefined, so that it gets deleted on undo
      this.initialShape.handles[this.handleId].bindingId = undefined
    }
  }

  start = (data: Data) => data

  update = (
    data: Data,
    point: number[],
    shiftKey: boolean,
    altKey: boolean,
    metaKey: boolean
  ): Partial<Data> => {
    const { initialShape } = this

    const shape = TLDR.getShape<ArrowShape>(data, initialShape.id)

    const handles = shape.handles

    const handleId = this.handleId as keyof typeof handles

    const delta = Vec.sub(point, handles[handleId].point)

    const handle = {
      ...handles[handleId],
      point: Vec.sub(Vec.add(handles[handleId].point, delta), shape.point),
    }

    // First update the handle's next point
    const change = TLDR.getShapeUtils(shape).onHandleChange(
      shape,
      {
        [handleId]: handle,
      },
      { delta, shiftKey, altKey, metaKey }
    )

    if (!change) return data

    let nextBindings: Record<string, TLDrawBinding> = { ...data.page.bindings }

    let nextShape = { ...shape, ...change }

    if (handle.canBind) {
      let nextBinding: ArrowBinding | undefined = undefined
      let nextTarget: TLDrawShape | undefined = undefined

      // Alt key skips binding
      if (!altKey) {
        const oppositeHandle = handles[handle.id === 'start' ? 'end' : 'start']

        // Find the origin and direction of the handle
        const rayOrigin = Vec.add(oppositeHandle.point, shape.point)
        const rayPoint = Vec.add(handle.point, shape.point)
        const rayDirection = Vec.uni(Vec.sub(rayPoint, rayOrigin))

        const oppositeBinding = oppositeHandle.bindingId
          ? data.page.bindings[oppositeHandle.bindingId]
          : undefined

        // From all bindable shapes on the page...
        for (const id of this.bindableShapeIds) {
          if (id === initialShape.id) continue
          if (id === oppositeBinding?.toId) continue

          const target = TLDR.getShape(data, id)

          const util = TLDR.getShapeUtils(target)

          const bindingPoint = util.getBindingPoint(
            target,
            rayPoint,
            rayOrigin,
            rayDirection,
            32,
            metaKey
          )

          // Not all shapes will produce a binding point
          if (!bindingPoint) continue

          // Stop at the first shape that will produce a binding point
          nextTarget = target

          nextBinding = {
            id: this.newBindingId,
            type: 'arrow',
            fromId: initialShape.id,
            handleId: this.handleId,
            toId: target.id,
            point: Vec.round(bindingPoint.point),
            distance: bindingPoint.distance,
          }

          break
        }
      }

      // If we didn't find a target...
      if (nextBinding === undefined) {
        this.didBind = false
        if (handle.bindingId) {
          delete nextBindings[handle.bindingId]
        }
        nextShape.handles[handleId].bindingId = undefined
      } else if (nextTarget) {
        this.didBind = true

        if (handle.bindingId && handle.bindingId !== this.newBindingId) {
          delete nextBindings[handle.bindingId]
          nextShape.handles[handleId].bindingId = undefined
        }

        // If we found a new binding, add its id to the handle...
        nextShape = {
          ...nextShape,
          handles: {
            ...nextShape.handles,
            [handleId]: {
              ...nextShape.handles[handleId],
              bindingId: nextBinding.id,
            },
          },
        }

        // and add it to the page's bindings
        nextBindings = {
          ...nextBindings,
          [nextBinding.id]: nextBinding,
        }

        // Now update the arrow in response to the new binding
        const arrowChange = TLDR.getShapeUtils(nextShape).onBindingChange(
          nextShape,
          nextBinding,
          nextTarget,
          TLDR.getShapeUtils(nextTarget).getBounds(nextTarget),
          TLDR.getShapeUtils(nextTarget).getCenter(nextTarget)
        )

        if (arrowChange) {
          nextShape = {
            ...nextShape,
            ...arrowChange,
          }
        }
      }
    }

    return {
      page: {
        ...data.page,
        shapes: {
          ...data.page.shapes,
          [shape.id]: nextShape,
        },
        bindings: nextBindings,
      },
      pageState: {
        ...data.pageState,
        bindingId: nextShape.handles[handleId].bindingId,
      },
    }
  }

  cancel = (data: Data) => {
    const { initialShape, newBindingId } = this

    const nextBindings = { ...data.page.bindings }

    if (this.didBind) {
      delete nextBindings[newBindingId]
    }

    return {
      page: {
        ...data.page,
        shapes: {
          ...data.page.shapes,
          [initialShape.id]: initialShape,
        },
        bindings: nextBindings,
      },
      pageState: {
        ...data.pageState,
        bindingId: undefined,
      },
    }
  }

  complete(data: Data) {
    const beforeBindings: Partial<Record<string, TLDrawBinding>> = {}
    const afterBindings: Partial<Record<string, TLDrawBinding>> = {}

    const currentShape = TLDR.getShape<ArrowShape>(data, this.initialShape.id)
    const currentBindingId = currentShape.handles[this.handleId].bindingId

    if (this.initialBinding) {
      beforeBindings[this.initialBinding.id] = this.initialBinding
      afterBindings[this.initialBinding.id] = undefined
    }

    if (currentBindingId) {
      beforeBindings[currentBindingId] = undefined
      afterBindings[currentBindingId] = data.page.bindings[currentBindingId]
    }

    return {
      id: 'arrow',
      before: {
        page: {
          shapes: {
            [this.initialShape.id]: this.initialShape,
          },
          bindings: beforeBindings,
        },
        pageState: {
          bindingId: undefined,
        },
      },
      after: {
        page: {
          shapes: {
            [this.initialShape.id]: data.page.shapes[this.initialShape.id],
          },
          bindings: afterBindings,
        },
        pageState: {
          bindingId: undefined,
        },
      },
    }
  }
}
