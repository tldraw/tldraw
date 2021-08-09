import { useTLContext } from '../../hooks'
import * as React from 'react'
import type { TLShapeUtil, TLRenderInfo, TLShape } from '../../../types'

interface EditingShapeProps<T extends TLShape> extends TLRenderInfo {
  shape: T
  utils: TLShapeUtil<T>
}

export function EditingTextShape({
  shape,
  utils,
  isEditing,
  isBinding,
  isDarkMode,
  isCurrentParent,
}: EditingShapeProps<TLShape>) {
  const {
    callbacks: {
      onTextChange,
      onTextBlur,
      onTextFocus,
      onTextKeyDown,
      onTextKeyUp,
    },
  } = useTLContext()

  const ref = React.useRef<HTMLElement>(null)

  return utils.render(shape, {
    ref,
    isEditing,
    isCurrentParent,
    isBinding,
    isDarkMode,
    onTextChange,
    onTextBlur,
    onTextFocus,
    onTextKeyDown,
    onTextKeyUp,
  })
}
