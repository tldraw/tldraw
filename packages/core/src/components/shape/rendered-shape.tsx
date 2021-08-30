import * as React from 'react'
import type { TLShapeUtil, TLRenderInfo, TLShape } from '+types'

interface RenderedShapeProps<T extends TLShape, M extends Record<string, unknown>>
  extends TLRenderInfo {
  shape: T
  utils: TLShapeUtil<T>
  meta?: M
}

export const RenderedShape = React.memo(
  function RenderedShape<M extends Record<string, unknown>>({
    shape,
    utils,
    isEditing,
    isBinding,
    isCurrentParent,
    meta,
  }: RenderedShapeProps<TLShape, M>) {
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
