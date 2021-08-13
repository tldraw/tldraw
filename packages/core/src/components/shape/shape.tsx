import * as React from 'react'
import { useShapeEvents, useTLContext } from '+hooks'
import type { IShapeTreeNode } from '+types'
import { RenderedShape } from './rendered-shape'
import { EditingTextShape } from './editing-text-shape'

export const Shape = React.memo(
  ({ shape, isEditing, isBinding, isDarkMode, isCurrentParent }: IShapeTreeNode) => {
    const { shapeUtils } = useTLContext()
    const events = useShapeEvents(shape.id, isCurrentParent)
    const utils = shapeUtils[shape.type]

    const center = utils.getCenter(shape)
    const rotation = (shape.rotation || 0) * (180 / Math.PI)
    const transform = `rotate(${rotation}, ${center}) translate(${shape.point})`

    return (
      <g
        className={isCurrentParent ? 'tl-shape-group tl-current-parent' : 'tl-shape-group'}
        id={shape.id}
        transform={transform}
        {...events}
      >
        {isEditing && utils.isEditableText ? (
          <EditingTextShape
            shape={shape}
            isBinding={false}
            isCurrentParent={false}
            isDarkMode={isDarkMode}
            isEditing={true}
            utils={utils}
          />
        ) : (
          <RenderedShape
            shape={shape}
            utils={utils}
            isBinding={isBinding}
            isCurrentParent={isCurrentParent}
            isDarkMode={isDarkMode}
            isEditing={isEditing}
          />
        )}
      </g>
    )
  }
)
