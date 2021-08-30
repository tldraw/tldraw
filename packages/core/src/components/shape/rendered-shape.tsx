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
    isCurrentParent,
    meta,
  }: RenderedShapeProps<TLShape>) {
    return utils.render(shape, {
      isEditing,
      isBinding,
      isCurrentParent,
      meta,
    })
  },
  (prev, next) => {
    if (
      prev.isEditing !== next.isEditing ||
      prev.isBinding !== next.isBinding ||
      prev.meta !== next.meta ||
      prev.isCurrentParent !== next.isCurrentParent
    ) {
      return false
    }

    if (next.shape !== prev.shape) {
      return !next.utils.shouldRender(next.shape, prev.shape)
    }

    return true
  }
)
