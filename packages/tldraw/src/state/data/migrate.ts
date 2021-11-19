/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Decoration, FontStyle, TDDocument, TDShapeType, TextShape } from '~types'

export function migrate(document: TDDocument, newVersion: number): TDDocument {
  const { version = 0 } = document

  if (version === newVersion) return document

  if (version < 14) {
    Object.values(document.pages).forEach((page) => {
      Object.values(page.shapes)
        .filter((shape) => shape.type === TDShapeType.Text)
        .forEach((shape) => (shape as TextShape).style.font === FontStyle.Script)
    })
  }

  // Lowercase styles, move binding meta to binding
  if (version <= 13) {
    Object.values(document.pages).forEach((page) => {
      Object.values(page.bindings).forEach((binding) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Object.assign(binding, (binding as any).meta)
      })

      Object.values(page.shapes).forEach((shape) => {
        Object.entries(shape.style).forEach(([id, style]) => {
          if (typeof style === 'string') {
            // @ts-ignore
            shape.style[id] = style.toLowerCase()
          }
        })

        if (shape.type === TDShapeType.Arrow) {
          if (shape.decorations) {
            Object.entries(shape.decorations).forEach(([id, decoration]) => {
              if ((decoration as unknown) === 'Arrow') {
                shape.decorations = {
                  ...shape.decorations,
                  [id]: Decoration.Arrow,
                }
              }
            })
          }
        }
      })
    })
  }

  // Add document name and file system handle
  if (version <= 13.1) {
    document.name = 'New Document'
  }

  // Cleanup
  Object.values(document.pageStates).forEach((pageState) => {
    pageState.selectedIds = pageState.selectedIds.filter((id) => {
      return document.pages[pageState.id].shapes[id] !== undefined
    })
    pageState.bindingId = undefined
    pageState.editingId = undefined
    pageState.hoveredId = undefined
    pageState.pointedId = undefined
  })

  document.version = newVersion

  return document
}
