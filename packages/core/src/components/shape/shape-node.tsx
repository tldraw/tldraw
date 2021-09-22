import * as React from 'react'
import type { IShapeTreeNode, TLShape, TLShapeUtils } from '+types'
import { Shape } from './shape'

interface ShapeNodeProps<T extends TLShape, E extends Element> extends IShapeTreeNode<T> {
  utils: TLShapeUtils<T, E>
}

export const ShapeNode = React.memo(
  <T extends TLShape, E extends Element>({
    shape,
    utils,
    children,
    isEditing,
    isBinding,
    isHovered,
    isSelected,
    isCurrentParent,
    meta,
  }: ShapeNodeProps<T, E>) => {
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
          children.map((childNode, i) => (
            <ShapeNode key={childNode.shape.id} utils={utils} {...childNode} />
          ))}
      </>
    )
  }
)
