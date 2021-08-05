import { TLDrawShape } from '../../../shape'
import { Data, Command } from '../../state-types'
import { TLDR } from '../../tldr'

export function toggle(data: Data, ids: string[], prop: keyof TLDrawShape): Command {
  const initialShapes = ids.map(id => data.page.shapes[id])
  const isAllToggled = initialShapes.every(shape => shape[prop])

  const { before, after } = TLDR.mutateShapes(data, TLDR.getSelectedIds(data), () => ({
    [prop]: !isAllToggled,
  }))

  return {
    id: 'toggle_shapes',
    before: {
      page: {
        shapes: {
          ...before,
        },
      },
    },
    after: {
      page: {
        shapes: {
          ...after,
        },
      },
    },
  }
}
