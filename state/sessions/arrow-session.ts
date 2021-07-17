import {
  ArrowShape,
  BindingChangeType,
  BindingType,
  Data,
  Shape,
  ShapeType,
} from 'types'
import vec from 'utils/vec'
import BaseSession from './base-session'
import commands from 'state/commands'
import tld from 'utils/tld'
import { getShapeUtils } from 'state/shape-utils'
import { deepClone } from 'utils'

export default class ArrowSession extends BaseSession {
  delta = [0, 0]
  origin: number[]
  shiftKey: boolean
  snapshot: ArrowSnapshot
  handleId: keyof ArrowShape['handles']
  isCreating: boolean

  constructor(
    data: Data,
    shapeId: string,
    handleId: keyof ArrowShape['handles'],
    point: number[],
    isCreating: boolean
  ) {
    super(data)
    this.origin = point
    this.handleId = handleId
    this.isCreating = isCreating
    this.snapshot = getArrowSnapshot(data, shapeId, handleId)
  }

  update(
    data: Data,
    point: number[],
    shiftKey: boolean,
    altKey: boolean,
    metaKey: boolean
  ): void {
    const { initialShape, bindableShapeIds } = this.snapshot

    const shape = tld.getShape(data, initialShape.id)

    tld.assertShapeType(shape, ShapeType.Arrow)

    this.shiftKey = shiftKey

    const delta = vec.vec(this.origin, point)

    const handles = initialShape.handles

    const handle = handles[this.handleId]

    const nextPoint = vec.round(vec.add(handles[this.handleId].point, delta))

    if (handle.canBind) {
      // Clear binding and try to set a new one
      data.currentBinding = undefined

      const opposite = handle.id === 'start' ? handles.end : handles.start
      const origin = opposite.point
      const direction = vec.uni(vec.vec(origin, point))

      for (const id of bindableShapeIds) {
        const target = tld.getShape(data, id)

        const bindingPoint = getShapeUtils(target).getBindingPoint(
          target,
          point,
          origin,
          direction
        )

        if (bindingPoint) {
          data.currentBinding = {
            id,
            point: bindingPoint,
          }

          break
        }
      }

      if (opposite.binding) {
        const op_target = tld.getShape(data, opposite.binding.id)

        const bounds = getShapeUtils(op_target).getBounds(op_target)

        getShapeUtils(shape).onBindingChange(shape, {
          type: BindingChangeType.Update,
          id: op_target.id,
          bounds,
        })
      }
    }

    // Update shape from handle change
    getShapeUtils(shape).onHandleChange(
      shape,
      {
        [this.handleId]: {
          ...handles[this.handleId],
          point: nextPoint, // vec.rot(delta, shape.rotation)),
        },
      },
      { delta, shiftKey, altKey, metaKey }
    )
  }

  cancel(data: Data): void {
    const { initialShape } = this.snapshot

    delete data.currentBinding

    if (this.isCreating) {
      tld.deleteShapes(data, [initialShape])
    } else {
      tld.getPage(data).shapes[initialShape.id] = initialShape
    }
  }

  complete(data: Data): void {
    const { oldBindingTarget, initialShape } = this.snapshot

    const shape = tld.getShape(data, initialShape.id)

    let target: Shape
    let mutatedTarget: Shape
    let mutatedOldTarget: Shape

    // Clear out the old binding target.
    if (oldBindingTarget) {
      mutatedOldTarget = deepClone(oldBindingTarget)

      getShapeUtils(mutatedOldTarget).setProperty(
        mutatedOldTarget,
        'bindings',
        mutatedOldTarget.bindings.filter((id) => id !== initialShape.id)
      )
    }

    // If we're creating a new binding.
    if (data.currentBinding) {
      // Find the arrow's new target shape
      target = deepClone(tld.getShape(data, data.currentBinding.id))

      // Get the target point
      const bounds = getShapeUtils(target).getBounds(target)

      const targetPoint = vec.add(
        [bounds.minX, bounds.minY],
        vec.mulV(data.currentBinding.point, [bounds.width, bounds.height])
      )

      // Update the shape with the new binding.
      const handlePoint = shape.handles[this.handleId].point
      const distance = vec.dist(vec.add(handlePoint, shape.point), targetPoint)

      getShapeUtils(shape).onBindingChange(shape, {
        type: BindingChangeType.Create,
        id: target.id,
        handleId: this.handleId,
        binding: {
          id: target.id,
          type: BindingType.Direction,
          point: [...data.currentBinding.point],
          distance,
        },
      })

      // Create a mutated target with the new binding
      mutatedTarget = deepClone(target)

      // Add this shape's id to the target's bindings
      getShapeUtils(mutatedTarget).setProperty(
        mutatedTarget,
        'bindings',
        mutatedTarget.bindings
          ? [...target.bindings, initialShape.id]
          : [initialShape.id]
      )
    }

    // Clear the current binding in state
    delete data.currentBinding

    const mutatedShape = deepClone(tld.getShape(data, initialShape.id))

    if (this.isCreating) {
      commands.createShapes(
        data,
        [mutatedShape],
        [oldBindingTarget, target],
        [mutatedOldTarget, mutatedTarget].filter(Boolean)
      )
    } else {
      commands.mutate(
        data,
        [initialShape, target, oldBindingTarget],
        [mutatedShape, mutatedOldTarget, mutatedTarget].filter(Boolean)
      )
    }
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getArrowSnapshot(
  data: Data,
  shapeId: string,
  handleId: string
) {
  const shape = tld.getShape(data, shapeId)
  const bindableShapeIds = tld
    .getBindableShapes(data, shape)
    .sort((a, b) => b.childIndex - a.childIndex)
    .map((shape) => shape.id)

  let oldBindingTarget: Shape

  const oldBinding = shape.handles[handleId].binding

  if (oldBinding) {
    oldBindingTarget = deepClone(tld.getShape(data, oldBinding.id))
  }

  return {
    initialShape: deepClone(shape),
    oldBindingTarget,
    bindableShapeIds,
  }
}

export type ArrowSnapshot = ReturnType<typeof getArrowSnapshot>
