import type { TLBinding, TLPage, TLPageState, TLShape } from '~types'

export function useHandles<T extends TLShape>(page: TLPage<T, TLBinding>, pageState: TLPageState) {
  const { selectedIds } = pageState

  let shapeWithHandles: TLShape | undefined = undefined

  if (selectedIds.length === 1) {
    const id = selectedIds[0]

    const shape = page.shapes[id]

    if (shape.handles !== undefined) {
      shapeWithHandles = shape
    }
  }

  return { shapeWithHandles }
}
