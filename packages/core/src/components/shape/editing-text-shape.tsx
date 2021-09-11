import { useTLContext } from '+hooks'
import * as React from 'react'
import type { TLShapeUtil, TLRenderInfo, TLShape } from '+types'

export function EditingTextShape<
  T extends TLShape,
  E extends SVGElement | HTMLElement,
  M extends Record<string, unknown>
>({
  shape,
  utils,
  isEditing,
  isBinding,
  isHovered,
  isSelected,
  isCurrentParent,
  events,
  meta,
}: TLRenderInfo<M, E> & {
  shape: T
  utils: TLShapeUtil<T, E>
}) {
  const {
    callbacks: { onTextChange, onTextBlur, onTextFocus, onTextKeyDown, onTextKeyUp },
  } = useTLContext()

  const ref = utils.getRef(shape)

  React.useEffect(() => {
    // Firefox fix?
    setTimeout(() => {
      if (document.activeElement !== ref.current) {
        ref.current?.focus()
      }
    }, 0)
  }, [shape.id])

  return (
    <utils.render
      ref={ref}
      {...{
        shape,
        isEditing,
        isHovered,
        isSelected,
        isCurrentParent,
        isBinding,
        meta,
        events: { ...events, onTextChange, onTextBlur, onTextFocus, onTextKeyDown, onTextKeyUp },
      }}
    />
  )
}
