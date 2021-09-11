import * as React from 'react'
import type { IShapeTreeNode, TLShape, TLShapeUtils } from '+types'
import { Shape } from './shape'

export const ShapeNode = React.memo(
  ({
    shape,
    utils,
    children,
    isEditing,
    isBinding,
    isHovered,
    isSelected,
    isCurrentParent,
    meta,
  }: { utils: TLShapeUtils<TLShape, Element> } & IShapeTreeNode<TLShape, any>) => {
    return (
      <>
        <Shape
          shape={shape}
          isEditing={isEditing}
          isBinding={isBinding}
          isHovered={isHovered}
          isSelected={isSelected}
          isCurrentParent={isCurrentParent}
          utils={utils[shape.type]}
          meta={meta}
        />
        {children &&
          children.map((childNode) => (
            <ShapeNode key={childNode.shape.id} utils={utils} {...childNode} />
          ))}
      </>
    )
  }
)
