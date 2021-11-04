/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Decoration, TLDrawDocument, TLDrawShapeType } from '~types'

export function migrate(document: TLDrawDocument, newVersion: number): TLDrawDocument {
  const { version = 0 } = document

  if (version === newVersion) return document

  if (version <= 12) {
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

  document.version = newVersion

  return document
}
