/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Decoration, TLDrawDocument, TLDrawShapeType } from '~types'

export function migrate(document: TLDrawDocument, newVersion: number): TLDrawDocument {
  const { version = 0 } = document

  console.log(`Migrating document from ${version} to ${newVersion}.`)

  if (version === newVersion) return document

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

        if (shape.type === TLDrawShapeType.Arrow) {
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
