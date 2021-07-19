import {
  ArrowShape,
  ArrowShapeBinding,
  BindingType,
  Data,
  Shape,
  ShapeBinding,
  ShapeType,
} from 'types'
import vec from 'utils/vec'
import BaseSession from './base-session'
import commands from 'state/commands'
import tld from 'utils/tld'
import { getShapeUtils } from 'state/shape-utils'
import { deepClone, uniqueId } from 'utils'

export default class ArrowSession extends BaseSession {
  delta = [0, 0]
  origin: number[]
  shiftKey: boolean
  snapshot: ArrowSnapshot
  handleId: keyof ArrowShape['handles']
  isCreating: boolean
  deletedBindings: ShapeBinding[] = []

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

    const initialHandle = initialShape.handles[this.handleId]

    const nextPoint = vec.round(vec.add(initialHandle.point, delta))

    if (initialHandle.canBind) {
      // Clear binding and try to set a new one
      const prevBindingId = shape.handles[this.handleId].binding

      let nextBinding: ArrowShapeBinding
      let nextTarget: Shape

      const opposite =
        initialHandle.id === 'start'
          ? initialShape.handles.end
          : initialShape.handles.start

      const origin = vec.add(opposite.point, shape.point)

      const direction = vec.uni(vec.vec(origin, point))

      for (const bindableShapeId of bindableShapeIds) {
        const target = tld.getShape(data, bindableShapeId)

        const bindingPoint = getShapeUtils(target).getBindingPoint(
          target,
          point,
          origin,
          direction
        )

        if (bindingPoint) {
          nextTarget = target

          // Create a new binding
          const id = this.snapshot.bindingId

          data.editingBindingId = id

          nextBinding = {
            id,
            type: BindingType.Arrow,
            fromId: initialShape.id,
            fromHandleId: this.handleId,
            toId: bindableShapeId,
            point: bindingPoint.point,
            distance: bindingPoint.distance,
          }

          tld.createBindings(data, [nextBinding])

          break
        }
      }

      if (nextBinding) {
        if (!prevBindingId) {
          // We're creating a new binding for this shape

          // Add the binding to the shape's handles
          getShapeUtils(shape).setProperty(shape, 'handles', {
            ...shape.handles,
            [this.handleId]: {
              ...shape.handles[this.handleId],
              binding: nextBinding.id,
            },
          })
        } else {
          if (prevBindingId === nextBinding.id) {
            // We're re-binding to the same shape, update the binding.
          } else {
            // We're binding to a new shape instead of the previous one

            // Delete the old binding from the page's bindings
            tld.deleteBindings(data, [prevBindingId])

            // Add the binding to the shape's handles
            getShapeUtils(shape).setProperty(shape, 'handles', {
              ...shape.handles,
              [this.handleId]: {
                ...shape.handles[this.handleId],
                binding: nextBinding.id,
              },
            })
          }
        }

        // Update the shape on binding change
        getShapeUtils(shape).onBindingChange(
          shape,
          tld.getBinding(data, nextBinding.id),
          nextTarget,
          getShapeUtils(nextTarget).getBounds(nextTarget)
        )
      } else {
        data.editingBindingId = undefined

        if (prevBindingId) {
          // Delete the binding from the page's bindings
          tld.deleteBindings(data, [prevBindingId])

          // Remove the binding from the shape's handle and update it
          getShapeUtils(shape).setProperty(shape, 'handles', {
            ...shape.handles,
            [this.handleId]: {
              ...shape.handles[this.handleId],
              binding: undefined,
            },
          })
        }
      }
    }

    // Update shape from handle change
    getShapeUtils(shape).onHandleChange(
      shape,
      {
        [this.handleId]: {
          ...shape.handles[this.handleId],
          point: nextPoint, // vec.rot(delta, shape.rotation)),
        },
      },
      { delta, shiftKey, altKey, metaKey }
    )
  }

  cancel(data: Data): void {
    const { initialShape } = this.snapshot

    delete data.editingBindingId

    if (this.isCreating) {
      tld.deleteShapes(data, [initialShape])
    } else {
      tld.getPage(data).shapes[initialShape.id] = initialShape
    }
  }

  complete(data: Data): void {
    const { initialShape } = this.snapshot

    delete data.editingBindingId

    const mutatedShape = deepClone(tld.getShape(data, initialShape.id))

    if (this.isCreating) {
      commands.createShapes(data, [mutatedShape])
    } else {
      commands.mutate(data, [initialShape], [mutatedShape])
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

  const oldBinding = shape.handles[handleId].binding

  return {
    initialShape: deepClone(shape),
    initialBindingId: oldBinding?.id,
    bindingId: oldBinding?.id || uniqueId(),
    bindableShapeIds,
  }
}

export type ArrowSnapshot = ReturnType<typeof getArrowSnapshot>
