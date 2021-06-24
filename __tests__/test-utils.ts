import { Data } from 'types'
import { getSelectedIds } from 'utils'

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
