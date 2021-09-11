/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { useShapeEvents } from '+hooks'
import type { IShapeTreeNode, TLShape, TLShapeUtil } from '+types'
import { RenderedShape } from './rendered-shape'
import { Container } from '+components/container'
import { useTLContext } from '+hooks'

// function setTransform(elm: HTMLDivElement, bounds: TLBounds, rotation = 0) {
//   const transform = `
//   translate(calc(${bounds.minX}px - var(--tl-padding)),calc(${bounds.minY}px - var(--tl-padding)))
//   rotate(${rotation + (bounds.rotation || 0)}rad)
//   `
//   elm.style.setProperty('transform', transform)
//   elm.style.setProperty('width', `calc(${bounds.width}px + (var(--tl-padding) * 2))`)
//   elm.style.setProperty('height', `calc(${bounds.height}px + (var(--tl-padding) * 2))`)
// }

export const Shape = <T extends TLShape, E extends Element, M extends Record<string, unknown>>({
  shape,
  utils,
  isEditing,
  isBinding,
  isHovered,
  isSelected,
  isCurrentParent,
  meta,
}: IShapeTreeNode<T, M> & {
  utils: TLShapeUtil<T, E>
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
