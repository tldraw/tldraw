import * as React from 'react'
import type { IShapeTreeNode } from '+types'
import { Shape } from './shape'

export const ShapeNode = React.memo(
  <M extends Record<string, unknown>>({
    shape,
    children,
    isEditing,
    isBinding,
    isHovered,
    isSelected,
    isCurrentParent,
    meta,
  }: IShapeTreeNode<M>) => {
    return (
      <>
        <Shape
          shape={shape}
          isEditing={isEditing}
          isBinding={isBinding}
          isHovered={isHovered}
          isSelected={isSelected}
          isCurrentParent={isCurrentParent}
          meta={meta}
        />
        {children &&
          children.map((childNode) => <ShapeNode key={childNode.shape.id} {...childNode} />)}
      </>
    )
  }
)
