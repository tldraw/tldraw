import { Data } from 'types'
import { getSelectedIds } from 'utils'

export const rectangleId = '1f6c251c-e12e-40b4-8dd2-c1847d80b72f'
export const arrowId = '5ca167d7-54de-47c9-aa8f-86affa25e44d'

interface PointerOptions {
  id?: string
  x?: number
  y?: number
  shiftKey?: boolean
  altKey?: boolean
  ctrlKey?: boolean
}

export function point(
  options: PointerOptions = {} as PointerOptions
): PointerEvent {
  const {
    id = '1',
    x = 0,
    y = 0,
    shiftKey = false,
    altKey = false,
    ctrlKey = false,
  } = options

  return {
    shiftKey,
    altKey,
    ctrlKey,
    pointerId: id,
    clientX: x,
    clientY: y,
  } as any
}

export function idsAreSelected(
  data: Data,
  ids: string[],
  strict = true
): boolean {
  const selectedIds = getSelectedIds(data)
  return (
    (strict ? selectedIds.size === ids.length : true) &&
    ids.every((id) => selectedIds.has(id))
  )
}
