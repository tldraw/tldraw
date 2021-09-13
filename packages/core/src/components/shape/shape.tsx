/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { useShapeEvents } from '+hooks'
import type { IShapeTreeNode, TLShape, TLShapeUtil } from '+types'
import { RenderedShape } from './rendered-shape'
import { Container } from '+components/container'
import { useTLContext } from '+hooks'

export const Shape = <T extends TLShape, E extends Element, M = any>({
  shape,
  utils,
  isEditing,
  isBinding,
  isHovered,
  isSelected,
  isCurrentParent,
  meta,
}: IShapeTreeNode<T, M> & {
  utils: TLShapeUtil<T, E, M>
}) => {
  const { callbacks } = useTLContext()
  const bounds = utils.getBounds(shape)
  const events = useShapeEvents(shape.id, isCurrentParent)

  return (
    <Container
      id={shape.id}
      className={'tl-shape' + (isCurrentParent ? 'tl-current-parent' : '')}
      bounds={bounds}
      rotation={shape.rotation}
    >
      <RenderedShape
        shape={shape}
        isBinding={isBinding}
        isCurrentParent={isCurrentParent}
        isEditing={isEditing}
        isHovered={isHovered}
        isSelected={isSelected}
        utils={utils as any}
        meta={meta as any}
        events={events}
        onShapeChange={callbacks.onShapeChange}
      />
    </Container>
  )
}
