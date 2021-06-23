interface PointerOptions {
  id?: string
  x?: number
  y?: number
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
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
    metaKey = false,
  } = options

  return {
    shiftKey,
    altKey,
    metaKey,
    pointerId: id,
    clientX: x,
    clientY: y,
  } as any
}
