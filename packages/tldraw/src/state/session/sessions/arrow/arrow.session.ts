import {
  ArrowBinding,
  ArrowShape,
  TLDrawShape,
  TLDrawBinding,
  Data,
  Session,
  TLDrawStatus,
} from '~types'
import { Vec, Utils, TLHandle } from '@tldraw/core'
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
    const { currentPageId } = data.appState
    const page = data.document.pages[currentPageId]
    const pageState = data.document.pageStates[currentPageId]

    const shapeId = pageState.selectedIds[0]
    this.origin = point
    this.handleId = handleId
    this.initialShape = TLDR.getShape<ArrowShape>(data, shapeId, data.appState.currentPageId)
    this.bindableShapeIds = TLDR.getBindableShapeIds(data)

    const initialBindingId = this.initialShape.handles[this.handleId].bindingId

    if (initialBindingId) {
      this.initialBinding = page.bindings[initialBindingId]
    } else {
      // Explicitly set this handle to undefined, so that it gets deleted on undo
      this.initialShape.handles[this.handleId].bindingId = undefined
    }
  }

  start = () => void null

  update = (data: Data, point: number[], shiftKey: boolean, altKey: boolean, metaKey: boolean) => {
    const page = TLDR.getPage(data, data.appState.currentPageId)

    const { initialShape } = this

    const shape = TLDR.getShape<ArrowShape>(data, initialShape.id, data.appState.currentPageId)

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

    // If the handle changed produced no change, bail here
    if (!change) return

    // If we've made it this far, the shape should be a new objet reference
    // that incorporates the changes we've made due to the handle movement.
    let nextShape = { ...shape, ...change }

    // If nothing changes, we want this to be the same object reference as
    // before. If it does change, we'll redefine this later on.
    let nextBindings: Record<string, TLDrawBinding | undefined> = page.bindings

    // If the handle can bind, then we need to search bindable shapes for
    // a binding. If the handle already has a binding, then we will either
    // update that binding or delete it (if no binding is found).
    if (handle.canBind) {
      // const { binding, target } = findBinding(
      //   data,
      //   initialShape,
      //   handle,
      //   this.newBindingId,
      //   this.bindableShapeIds,
      //   page.bindings,
      //   altKey,
      //   metaKey
      // )

      let binding: ArrowBinding | undefined = undefined
      let target: TLDrawShape | undefined = undefined

      // Alt key skips binding
      if (!altKey) {
        const oppositeHandle = handles[handle.id === 'start' ? 'end' : 'start']

        // Find the origin and direction of the handle
        const rayOrigin = Vec.add(oppositeHandle.point, shape.point)
        const rayPoint = Vec.add(handle.point, shape.point)
        const rayDirection = Vec.uni(Vec.sub(rayPoint, rayOrigin))

        const oppositeBinding = oppositeHandle.bindingId
          ? page.bindings[oppositeHandle.bindingId]
          : undefined

        // From all bindable shapes on the page...
        for (const id of this.bindableShapeIds) {
          if (id === initialShape.id) continue
          if (id === shape.parentId) continue
          if (id === oppositeBinding?.toId) continue

          target = TLDR.getShape(data, id, data.appState.currentPageId)

          const util = TLDR.getShapeUtils(target)

          const bindingPoint = util.getBindingPoint(
            target,
            nextShape,
            rayPoint,
            rayOrigin,
            rayDirection,
            32,
            metaKey
          )

          // Not all shapes will produce a binding point
          if (!bindingPoint) continue

          binding = {
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
      if (binding === undefined) {
        this.didBind = false

        if (handle.bindingId) {
          nextBindings = { ...nextBindings }
          nextBindings[handle.bindingId] = undefined
        }
        nextShape.handles[handleId].bindingId = undefined
      } else if (target) {
        this.didBind = true
        nextBindings = { ...nextBindings }

        if (handle.bindingId && handle.bindingId !== this.newBindingId) {
          nextBindings[handle.bindingId] = undefined
          nextShape.handles[handleId].bindingId = undefined
        }

        // If we found a new binding, add its id to the shape's handle...
        nextShape = {
          ...nextShape,
          handles: {
            ...nextShape.handles,
            [handleId]: {
              ...nextShape.handles[handleId],
              bindingId: binding.id,
            },
          },
        }

        // and add it to the page's bindings
        nextBindings = {
          ...nextBindings,
          [binding.id]: binding,
        }

        // Now update the arrow in response to the new binding
        const targetUtils = TLDR.getShapeUtils(target)
        const arrowChange = TLDR.getShapeUtils(nextShape).onBindingChange(
          nextShape,
          binding,
          target,
          targetUtils.getBounds(target),
          targetUtils.getCenter(target)
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
      document: {
        pages: {
          [data.appState.currentPageId]: {
            shapes: {
              [shape.id]: nextShape,
            },
            bindings: nextBindings,
          },
        },
        pageStates: {
          [data.appState.currentPageId]: {
            bindingId: nextShape.handles[handleId].bindingId,
          },
        },
      },
    }
  }

  cancel = (data: Data) => {
    const { initialShape, newBindingId } = this

    return {
      document: {
        pages: {
          [data.appState.currentPageId]: {
            shapes: {
              [initialShape.id]: initialShape,
            },
            bindings: {
              [newBindingId]: undefined,
            },
          },
        },
        pageStates: {
          [data.appState.currentPageId]: {
            bindingId: undefined,
          },
        },
      },
    }
  }

  complete(data: Data) {
    const { initialShape, initialBinding, handleId } = this
    const page = TLDR.getPage(data, data.appState.currentPageId)

    const beforeBindings: Partial<Record<string, TLDrawBinding>> = {}
    const afterBindings: Partial<Record<string, TLDrawBinding>> = {}

    const currentShape = TLDR.getShape<ArrowShape>(
      data,
      initialShape.id,
      data.appState.currentPageId
    )
    const currentBindingId = currentShape.handles[handleId].bindingId

    if (initialBinding) {
      beforeBindings[initialBinding.id] = initialBinding
      afterBindings[initialBinding.id] = undefined
    }

    if (currentBindingId) {
      beforeBindings[currentBindingId] = undefined
      afterBindings[currentBindingId] = page.bindings[currentBindingId]
    }

    return {
      id: 'arrow',
      before: {
        document: {
          pages: {
            [data.appState.currentPageId]: {
              shapes: {
                [initialShape.id]: initialShape,
              },
              bindings: beforeBindings,
            },
          },
          pageStates: {
            [data.appState.currentPageId]: {
              bindingId: undefined,
            },
          },
        },
      },
      after: {
        document: {
          pages: {
            [data.appState.currentPageId]: {
              shapes: {
                [initialShape.id]: TLDR.onSessionComplete(
                  data,
                  TLDR.getShape(data, initialShape.id, data.appState.currentPageId),
                  data.appState.currentPageId
                ),
              },
              bindings: afterBindings,
            },
          },
          pageStates: {
            [data.appState.currentPageId]: {
              bindingId: undefined,
            },
          },
        },
      },
    }
  }
}

function findBinding(
  data: Data,
  shape: ArrowShape,
  handle: TLHandle,
  newBindingId: string,
  bindableShapeIds: string[],
  bindings: Record<string, TLDrawBinding | undefined>,
  altKey: boolean,
  metaKey: boolean
) {
  let nextBinding: ArrowBinding | undefined = undefined
  let nextTarget: TLDrawShape | undefined = undefined

  if (!altKey) {
    const oppositeHandle = shape.handles[handle.id === 'start' ? 'end' : 'start']

    // Find the origin and direction of the handle
    const rayOrigin = Vec.add(oppositeHandle.point, shape.point)
    const rayPoint = Vec.add(handle.point, shape.point)
    const rayDirection = Vec.uni(Vec.sub(rayPoint, rayOrigin))

    const oppositeBinding = oppositeHandle.bindingId
      ? bindings[oppositeHandle.bindingId]
      : undefined

    // From all bindable shapes on the page...
    for (const id of bindableShapeIds) {
      if (id === shape.id) continue
      if (id === shape.parentId) continue
      if (id === oppositeBinding?.toId) continue

      const target = TLDR.getShape(data, id, data.appState.currentPageId)

      const util = TLDR.getShapeUtils(target)

      const bindingPoint = util.getBindingPoint(
        target,
        shape,
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
        id: newBindingId,
        type: 'arrow',
        fromId: shape.id,
        handleId: handle.id as keyof ArrowShape['handles'],
        toId: target.id,
        point: Vec.round(bindingPoint.point),
        distance: bindingPoint.distance,
      }

      break
    }
  }

  return { target: nextTarget, binding: nextBinding }
}
