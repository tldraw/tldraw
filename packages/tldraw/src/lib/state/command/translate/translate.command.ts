import { Vec } from '@tldraw/core'
import { Data, Command } from '../../state-types'
import { TLDR } from '../../tldr'

export function translate(data: Data, ids: string[], delta: number[]): Command {
  const { before, after } = TLDR.mutateShapes(data, ids, (shape) => ({
    point: Vec.add(shape.point, delta),
  }))

  return {
    id: 'translate_shapes',
    before: {
      page: {
        ...data.page,
        shapes: {
          ...before,
        },
      },
    },
    after: {
      page: {
        ...data.page,
        shapes: {
          ...after,
        },
      },
    },
  }
}
