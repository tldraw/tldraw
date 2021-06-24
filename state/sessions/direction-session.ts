import { Data, LineShape, RayShape } from 'types'
import vec from 'utils/vec'
import BaseSession from './base-session'
import commands from 'state/commands'
import { current } from 'immer'
import { getPage, getSelectedIds } from 'utils'

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
    const { shapes } = this.snapshot

    const page = getPage(data)

    for (const { id } of shapes) {
      const shape = page.shapes[id] as RayShape | LineShape

      shape.direction = vec.uni(vec.vec(shape.point, point))
    }
  }

  cancel(data: Data): void {
    const page = getPage(data)

    for (const { id, direction } of this.snapshot.shapes) {
      const shape = page.shapes[id] as RayShape | LineShape
      shape.direction = direction
    }
  }

  complete(data: Data): void {
    commands.direct(data, this.snapshot, getDirectionSnapshot(data))
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getDirectionSnapshot(data: Data) {
  const { shapes } = getPage(current(data))

  const snapshapes: { id: string; direction: number[] }[] = []

  getSelectedIds(data).forEach((id) => {
    const shape = shapes[id]
    if ('direction' in shape) {
      snapshapes.push({ id: shape.id, direction: shape.direction })
    }
  })

  return {
    currentPageId: data.currentPageId,
    shapes: snapshapes,
  }
}

export type DirectionSnapshot = ReturnType<typeof getDirectionSnapshot>
