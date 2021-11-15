import { ShapeStyles, TLDrawCommand, TLDrawShape, TLDrawShapeType, TextShape } from '~types'
import { TLDR } from '~state/TLDR'
import Vec from '@tldraw/vec'
import type { Patch } from 'rko'
import type { TLDrawApp } from '../../internal'

export function styleShapes(
  app: TLDrawApp,
  ids: string[],
  changes: Partial<ShapeStyles>
): TLDrawCommand {
  const { currentPageId, selectedIds } = app

  const shapeIdsToMutate = ids
    .flatMap((id) => TLDR.getDocumentBranch(app.state, id, currentPageId))
    .filter((id) => !app.getShape(id).isLocked)

  const beforeShapes: Record<string, Patch<TLDrawShape>> = {}
  const afterShapes: Record<string, Patch<TLDrawShape>> = {}

  shapeIdsToMutate
    .map((id) => app.getShape(id))
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
              app.getShapeUtils(shape).getCenter(shape),
              app.getShapeUtils(shape).getCenter({
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
        pageStates: {
          [currentPageId]: {
            selectedIds: selectedIds,
          },
        },
      },
      appState: {
        currentStyle: { ...app.appState.currentStyle },
      },
    },
    after: {
      document: {
        pages: {
          [currentPageId]: {
            shapes: afterShapes,
          },
        },
        pageStates: {
          [currentPageId]: {
            selectedIds: ids,
          },
        },
      },
      appState: {
        currentStyle: changes,
      },
    },
  }
}
