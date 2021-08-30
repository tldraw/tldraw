import { useTLContext } from '+hooks'
import * as React from 'react'
import type { TLShapeUtil, TLRenderInfo, TLShape } from '+types'

interface EditingShapeProps<T extends TLShape, M extends Record<string, unknown>>
  extends TLRenderInfo {
  shape: T
  utils: TLShapeUtil<T>
  meta?: M
}

export function EditingTextShape<M extends Record<string, unknown>>({
  shape,
  utils,
  isEditing,
  isBinding,
  isCurrentParent,
  meta,
}: EditingShapeProps<TLShape, M>) {
  const {
    callbacks: { onTextChange, onTextBlur, onTextFocus, onTextKeyDown, onTextKeyUp },
  } = useTLContext()

  const ref = React.useRef<HTMLElement>(null)

  return utils.render(shape, {
    ref,
    isEditing,
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
