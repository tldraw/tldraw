import { TLBinding, Utils } from '@tldraw/core'
import Vec from '@tldraw/vec'
import type { ArrowShape } from 'shapes/arrow'
import type { Action } from 'state/constants'
import { getBoundHandlePoint } from './getBoundHandlePoint'

export const updateBoundShapes: Action = (data) => {
  const bindings = Object.values(data.page.bindings)
  const bindingsToUpdate = [...bindings]
  const bindingsToDelete = new Set<TLBinding>()

  while (bindingsToUpdate.length > 0) {
    const binding = bindingsToUpdate.pop()

    if (!binding) break

    const toShape = data.page.shapes[binding.toId]
    const fromShape = data.page.shapes[binding.fromId] as ArrowShape

    // Did we delete one of the bindings shapes? If so, delete the binding too.
    if (!(toShape && fromShape)) {
      bindingsToDelete.add(binding)
      break
    }

    const boundHandle = fromShape.handles[binding.handleId]
    const intersection = getBoundHandlePoint(data, fromShape, toShape, boundHandle.id)

    if (intersection) {
      if (!Vec.isEqual(boundHandle.point, intersection)) {
        boundHandle.point = Vec.sub(intersection, fromShape.point)
        const handles = Object.values(fromShape.handles)
        const offset = Utils.getCommonTopLeft(handles.map((handle) => handle.point))
        fromShape.point = Vec.add(fromShape.point, offset)
        handles.forEach((handle) => (handle.point = Vec.sub(handle.point, offset)))
      }
    }
  }

  bindingsToDelete.forEach((binding) => delete data.page.bindings[binding.id])
}
