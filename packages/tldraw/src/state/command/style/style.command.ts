import { ShapeStyles, TLDrawCommand, Data, TLDrawShape, TLDrawShapeType, TextShape } from '~types'
import { TLDR } from '~state/tldr'
import type { Patch } from 'rko'
import Vec from '@tldraw/vec'

export function style(data: Data, ids: string[], changes: Partial<ShapeStyles>): TLDrawCommand {
  const { currentPageId } = data.appState

  const shapeIdsToMutate = ids.flatMap((id) => TLDR.getDocumentBranch(data, id, currentPageId))

  // const { before, after } = TLDR.mutateShapes(
  //   data,
  //   shapeIdsToMutate,
  //   (shape) => ({ style: { ...shape.style, ...changes } }),
  //   currentPageId
  // )

  const beforeShapes: Record<string, Patch<TLDrawShape>> = {}
  const afterShapes: Record<string, Patch<TLDrawShape>> = {}

  shapeIdsToMutate
    .map((id) => TLDR.getShape(data, id, currentPageId))
    .filter((shape) => !shape.isLocked)
    .forEach((shape) => {
      beforeShapes[shape.id] = {
        style: {
          ...Object.fromEntries(
            Object.keys(changes).map((key) => [key, shape.style[key as keyof typeof shape.style]])
          ),
        },
      }

      afterShapes[shape.id] = {
        style: changes,
      }

      if (shape.type === TLDrawShapeType.Text) {
        beforeShapes[shape.id].point = shape.point
        afterShapes[shape.id].point = Vec.round(
          Vec.add(
            shape.point,
            Vec.sub(
              TLDR.getShapeUtils(shape).getCenter(shape),
              TLDR.getShapeUtils(shape).getCenter({
                ...shape,
                style: { ...shape.style, ...changes },
              } as TextShape)
            )
          )
        )
      }
    })

  return {
    id: 'style',
    before: {
      document: {
        pages: {
          [currentPageId]: {
            shapes: beforeShapes,
          },
        },
      },
      appState: {
        currentStyle: { ...data.appState.currentStyle },
      },
    },
    after: {
      document: {
        pages: {
          [currentPageId]: {
            shapes: afterShapes,
          },
        },
      },
      appState: {
        currentStyle: { ...data.appState.currentStyle, ...changes },
      },
    },
  }
}
