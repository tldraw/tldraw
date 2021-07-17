import {
  ArrowShape,
  BindingChangeType,
  BindingType,
  Data,
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
    this.snapshot = getArrowSnapshot(data, shapeId)
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

      for (const id of bindableShapeIds) {
        const target = tld.getShape(data, id)

        const origin =
          handle.id === 'start'
            ? vec.add(shape.point, handles.end.point)
            : this.handleId === 'end'
            ? vec.add(shape.point, handles.start.point)
            : null

        const bindingPoint = getShapeUtils(target).getBindingPoint(
          target,
          point,
          origin,
          vec.uni(vec.vec(origin, point))
        )

        if (bindingPoint) {
          data.currentBinding = {
            id,
            point: bindingPoint,
          }

          break
        }
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
    const { initialShape } = this.snapshot

    if (data.currentBinding) {
      const target = tld.getShape(data, data.currentBinding.id)
      const bounds = getShapeUtils(target).getBounds(target)
      const targetPoint = vec.add(
        [bounds.minX, bounds.minY],
        vec.mulV(data.currentBinding.point, [bounds.width, bounds.height])
      )

      const shape = tld.getShape(data, initialShape.id)
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

      getShapeUtils(target).setProperty(
        target,
        'bindings',
        target.bindings
          ? [...target.bindings, initialShape.id]
          : [initialShape.id]
      )
    }

    delete data.currentBinding

    const before = initialShape
    const after = deepClone(tld.getShape(data, before.id))
    if (this.isCreating) {
      commands.createShapes(data, [after])
    } else {
      commands.mutate(data, [before], [after])
    }
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getArrowSnapshot(data: Data, shapeId: string) {
  const shape = tld.getShape(data, shapeId)
  const bindableShapeIds = tld
    .getBindableShapes(data, shape)
    .sort((a, b) => b.childIndex - a.childIndex)
    .map((shape) => shape.id)

  return {
    initialShape: deepClone(shape),
    bindableShapeIds,
  }
}

export type ArrowSnapshot = ReturnType<typeof getArrowSnapshot>
