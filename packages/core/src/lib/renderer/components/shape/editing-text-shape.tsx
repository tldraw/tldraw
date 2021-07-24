import * as React from 'react'
import { TLShapeUtil, TLRenderInfo, TLShape } from '../../../types'

interface EditingShapeProps<T extends TLShape> extends TLRenderInfo {
  shape: T
  utils: TLShapeUtil<T>
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
