import * as React from 'react'
import { TLRenderInfo, TLShape } from '../../types'
import { BaseShape } from '../../shape'

interface EditingShapeProps<T extends TLShape> extends TLRenderInfo {
  shape: T
  utils: BaseShape<T>
}

export function EditingTextShape({
  shape,
  utils,
  isEditing,
  isHovered,
  isBinding,
  isSelected,
  isDarkMode,
  isCurrentParent,
}: EditingShapeProps<TLShape>) {
  const ref = React.useRef<HTMLElement>(null)

  return utils.render(shape, {
    ref,
    isEditing,
    isHovered,
    isSelected,
    isCurrentParent,
    isBinding,
    isDarkMode,
  })
}
