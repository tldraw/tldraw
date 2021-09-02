import { useTLContext } from '+hooks'
import * as React from 'react'
import type { TLShapeUtil, TLRenderInfo, TLShape } from '+types'

interface EditingShapeProps<T extends TLShape> extends TLRenderInfo {
  shape: T
  utils: TLShapeUtil<T>
}

export function EditingTextShape({
  shape,
  utils,
  isEditing,
  isBinding,
  isHovered,
  isSelected,
  isCurrentParent,
  meta,
}: EditingShapeProps<TLShape>) {
  const {
    callbacks: { onTextChange, onTextBlur, onTextFocus, onTextKeyDown, onTextKeyUp },
  } = useTLContext()

  const ref = React.useRef<HTMLElement>(null)

  React.useEffect(() => {
    // Firefox fix?
    setTimeout(() => {
      if (document.activeElement !== ref.current) {
        ref.current?.focus()
      }
    }, 0)
  }, [shape.id])

  return utils.render(shape, {
    ref,
    isEditing,
    isHovered,
    isSelected,
    isCurrentParent,
    isBinding,
    onTextChange,
    onTextBlur,
    onTextFocus,
    onTextKeyDown,
    onTextKeyUp,
    meta,
  })
}
