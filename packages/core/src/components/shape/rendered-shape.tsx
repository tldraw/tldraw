import * as React from 'react'
import type { TLShapeUtil, TLRenderInfo, TLShape } from '+types'

interface RenderedShapeProps<T extends TLShape> extends TLRenderInfo {
  shape: T
  utils: TLShapeUtil<T>
}

export const RenderedShape = React.memo(
  function RenderedShape({
    shape,
    utils,
    isEditing,
    isBinding,
    isHovered,
    isSelected,
    isCurrentParent,
    meta,
  }: RenderedShapeProps<TLShape>) {
    return utils.render(shape, {
      isEditing,
      isBinding,
      isHovered,
      isSelected,
      isCurrentParent,
      meta,
    })
  },
  (prev, next) => {
    // If these have changed, then definitely render
    if (
      prev.isHovered !== next.isHovered ||
      prev.isSelected !== next.isSelected ||
      prev.isEditing !== next.isEditing ||
      prev.isBinding !== next.isBinding ||
      prev.meta !== next.meta ||
      prev.isCurrentParent !== next.isCurrentParent
    ) {
      return false
    }

    // If not, and if the shape has changed, ask the shape's class
    // whether it should render
    if (next.shape !== prev.shape) {
      return !next.utils.shouldRender(next.shape, prev.shape)
    }

    return true
  }
)
