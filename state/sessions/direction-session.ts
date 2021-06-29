import { Data, Shape } from 'types'
import vec from 'utils/vec'
import BaseSession from './base-session'
import commands from 'state/commands'
import tld from 'utils/tld'
import { deepClone } from 'utils'
import { getShapeUtils } from 'state/shape-utils'

export default class DirectionSession extends BaseSession {
  delta = [0, 0]
  origin: number[]
  snapshot: DirectionSnapshot

  constructor(data: Data, point: number[]) {
    super(data)
    this.origin = point
    this.snapshot = getDirectionSnapshot(data)
  }

  update(data: Data, point: number[]): void {
    const page = tld.getPage(data)

    this.snapshot.forEach((initialShape) => {
      const shape = page.shapes[initialShape.id]

      if ('direction' in shape) {
        getShapeUtils(shape).setProperty(
          shape,
          'direction',
          vec.uni(vec.vec(shape.point, point))
        )
      }
    })
  }

  cancel(data: Data): void {
    const page = tld.getPage(data)

    this.snapshot.forEach((initialShape) => {
      const shape = page.shapes[initialShape.id]

      if ('direction' in shape && 'direction' in initialShape) {
        getShapeUtils(shape).setProperty(
          shape,
          'direction',
          initialShape.direction
        )
      }
    })
  }

  complete(data: Data): void {
    commands.mutate(
      data,
      this.snapshot,
      getDirectionSnapshot(data),
      'change_direction'
    )
  }
}

export function getDirectionSnapshot(data: Data): Shape[] {
  return tld
    .getSelectedShapes(data)
    .filter((shape) => 'direction' in shape)
    .map((shape) => deepClone(shape))
}

export type DirectionSnapshot = ReturnType<typeof getDirectionSnapshot>
