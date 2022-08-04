import { observer } from 'mobx-react-lite'
import * as React from 'react'
import type { TLShapeUtil } from '~TLShapeUtil'
import type { TLComponentProps, TLShape } from '~types'

interface RenderedShapeProps<T extends TLShape, E extends Element, M>
  extends TLComponentProps<T, E, M> {
  shape: T
  utils: TLShapeUtil<T, E, M>
}

const _RenderedShape = observer(function RenderedShape<T extends TLShape, E extends Element, M>(
  props: RenderedShapeProps<T, E, M>
) {
  const ref = props.utils.getRef(props.shape)
  return <props.utils.Component ref={ref} {...props} />
})

export const RenderedShape = React.memo(_RenderedShape, (prev, next) => {
  // If these have changed, then definitely render
  if (
    prev.isHovered !== next.isHovered ||
    prev.isSelected !== next.isSelected ||
    prev.isEditing !== next.isEditing ||
    prev.isBinding !== next.isBinding ||
    prev.isGhost !== next.isGhost ||
    prev.meta !== next.meta
  ) {
    return false
  }

  // If not, and if the shape has changed, ask the shape's class
  // whether it should render
  if (next.shape !== prev.shape) {
    return !next.utils.shouldRender(next.shape, prev.shape)
  }

  return true
})
