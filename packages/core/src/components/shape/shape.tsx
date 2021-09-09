import * as React from 'react'
import { useShapeEvents } from '+hooks'
import type { IShapeTreeNode, TLShape, TLShapeUtil } from '+types'
import { RenderedShape } from './rendered-shape'
import { EditingTextShape } from './editing-text-shape'

export const Shape = <M extends Record<string, unknown>>({
  shape,
  utils,
  isEditing,
  isBinding,
  isHovered,
  isSelected,
  isCurrentParent,
  meta,
}: { utils: TLShapeUtil<TLShape> } & IShapeTreeNode<M>) => {
  const events = useShapeEvents(shape.id, isCurrentParent)
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
          isEditing={true}
          isHovered={isHovered}
          isSelected={isSelected}
          utils={utils}
          meta={meta}
        />
      ) : (
        <RenderedShape
          shape={shape}
          utils={utils}
          isBinding={isBinding}
          isCurrentParent={isCurrentParent}
          isEditing={isEditing}
          isHovered={isHovered}
          isSelected={isSelected}
          meta={meta}
        />
      )}
    </g>
  )
}
