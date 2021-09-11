import { useTLContext } from '+hooks'
import * as React from 'react'
import type { TLShapeUtil, TLRenderInfo, TLShape } from '+types'

interface EditingShapeProps<T extends TLShape, E extends HTMLElement | SVGElement>
  extends TLRenderInfo {
  shape: T
  utils: TLShapeUtil<T, E>
}

export function EditingTextShape<T extends TLShape, E extends HTMLElement | SVGElement>({
  shape,
  events,
  utils,
  isEditing,
  isBinding,
  isHovered,
  isSelected,
  isCurrentParent,
  meta,
}: EditingShapeProps<T, E>) {
  const {
    callbacks: { onTextChange, onTextBlur, onTextFocus, onTextKeyDown, onTextKeyUp },
  } = useTLContext()

  const ref = React.useRef<E>(null)

  React.useEffect(() => {
    // Firefox fix?
    setTimeout(() => {
      if (document.activeElement !== ref.current) {
        ref.current?.focus()
      }
    }, 0)
  }, [shape.id])

  return utils.render({
    ref,
    shape,
    isEditing,
    isHovered,
    isSelected,
    isCurrentParent,
    isBinding,
    events: {
      ...events,
      onTextChange,
      onTextBlur,
      onTextFocus,
      onTextKeyDown,
      onTextKeyUp,
    },
    meta,
  })
}
