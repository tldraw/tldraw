import * as React from 'react'
import type { IShapeTreeNode } from '+types'
import { Shape } from './shape'

export const ShapeNode = React.memo(
  <M extends Record<string, unknown>>({
    shape,
    children,
    isEditing,
    isBinding,
    isCurrentParent,
    meta,
  }: IShapeTreeNode<M>) => {
    return (
      <>
        <Shape
          shape={shape}
          isEditing={isEditing}
          isBinding={isBinding}
          isCurrentParent={isCurrentParent}
          meta={meta}
        />
        {children &&
          children.map((childNode) => <ShapeNode key={childNode.shape.id} {...childNode} />)}
      </>
    )
  }
)
