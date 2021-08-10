import type { ShapeStyles } from '../../../shape'
import type { Command, Data } from '../../state-types'
import { TLDR } from '../../tldr'

export function style(
  data: Data,
  ids: string[],
  changes: Partial<ShapeStyles>
): Command {
  const { before, after } = TLDR.mutateShapes(data, ids, (shape) => {
    return { style: { ...shape.style, ...changes } }
  })

  return {
    id: 'style_shapes',
    before: {
      page: {
        shapes: {
          ...before,
        },
      },
      appState: {
        currentStyle: { ...data.appState.currentStyle },
      },
    },
    after: {
      page: {
        shapes: {
          ...after,
        },
      },
      appState: {
        currentStyle: { ...data.appState.currentStyle, ...changes },
      },
    },
  }
}
