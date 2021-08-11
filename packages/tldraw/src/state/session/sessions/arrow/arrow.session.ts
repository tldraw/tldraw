import type { ArrowBinding, ArrowShape } from '../../../../shape'
import type { TLDrawShape } from '../../../../shape'
import type { Session } from '../../../state-types'
import type { Data } from '../../../state-types'
import { Vec, Utils, TLBinding } from '@tldraw/core'
import { TLDR } from '../../../tldr'

export class ArrowSession implements Session {
  id = 'transform_single'
  newBindingId = Utils.uniqueId()
  delta = [0, 0]
  origin: number[]
  shiftKey = false
  initialShape: ArrowShape
  handleId: 'start' | 'end'
  bindableShapeIds: string[]
  initialBinding: TLBinding | undefined
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
    const { initialShape, origin } = this

    const shape = TLDR.getShape<ArrowShape>(data, initialShape.id)

    TLDR.assertShapeHasProperty(shape, 'handles')

    this.shiftKey = shiftKey

    const delta = Vec.sub(point, origin)

    const handles = shape.handles

    const handleId = this.handleId as keyof typeof handles

    const handle = handles[handleId]

    let nextPoint = Vec.round(Vec.add(this.initialShape.handles[handleId].point, delta))

    // First update the handle's next point
    const change = TLDR.getShapeUtils(shape).onHandleChange(
      shape,
      {
        [handleId]: {
          ...shape.handles[handleId],
          point: nextPoint, // Vec.rot(delta, shape.rotation)),
        },
      },
      { delta, shiftKey, altKey, metaKey }
    )

    if (!change) return data

    let nextBindings: Record<string, TLBinding> = { ...data.page.bindings }
    let nextShape: ArrowShape = { ...shape, ...change }
    let nextBinding: ArrowBinding | undefined = undefined
    let nextTarget: TLDrawShape | undefined = undefined

    if (handle.canBind) {
      const oppositeHandle = handles[handle.id === 'start' ? 'end' : 'start']

      // Find the origin and direction of the handle
      const rayOrigin = Vec.add(oppositeHandle.point, shape.point)
      const rayPoint = Vec.add(nextPoint, shape.point)
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
    }
  }

  complete(data: Data) {
    let beforeBindings: Partial<Record<string, TLBinding>> = {}
    let afterBindings: Partial<Record<string, TLBinding>> = {}

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
      },
      after: {
        page: {
          shapes: {
            [this.initialShape.id]: TLDR.onSessionComplete(
              data,
              data.page.shapes[this.initialShape.id]
            ),
          },
          bindings: afterBindings,
        },
      },
    }
  }
}
