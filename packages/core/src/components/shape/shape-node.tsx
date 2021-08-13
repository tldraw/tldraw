import * as React from 'react'
import type { IShapeTreeNode } from '+types'
import { Shape } from './shape'

export const ShapeNode = React.memo(
  ({ shape, children, isEditing, isDarkMode, isBinding, isCurrentParent }: IShapeTreeNode) => {
    return (
      <>
        <Shape
          shape={shape}
          isEditing={isEditing}
          isDarkMode={isDarkMode}
          isBinding={isBinding}
          isCurrentParent={isCurrentParent}
        />
        {children &&
          children.map((childNode) => <ShapeNode key={childNode.shape.id} {...childNode} />)}
      </>
    )
  }
)
