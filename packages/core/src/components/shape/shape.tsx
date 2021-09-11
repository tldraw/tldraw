/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { usePosition, useShapeEvents } from '+hooks'
import type { IShapeTreeNode, TLBounds, TLShape, TLShapeUtil } from '+types'
import { RenderedShape } from './rendered-shape'
import { EditingTextShape } from './editing-text-shape'
import { Container } from '+components/container'
import { SVGContainer } from '+components/svg-container'

// function setTransform(elm: HTMLDivElement, bounds: TLBounds, rotation = 0) {
//   const transform = `
//   translate(calc(${bounds.minX}px - var(--tl-padding)),calc(${bounds.minY}px - var(--tl-padding)))
//   rotate(${rotation + (bounds.rotation || 0)}rad)
//   `
//   elm.style.setProperty('transform', transform)
//   elm.style.setProperty('width', `calc(${bounds.width}px + (var(--tl-padding) * 2))`)
//   elm.style.setProperty('height', `calc(${bounds.height}px + (var(--tl-padding) * 2))`)
// }

export const Shape = <
  T extends TLShape,
  E extends SVGElement | HTMLElement,
  M extends Record<string, unknown>
>({
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
  const bounds = utils.getBounds(shape)
  const events = useShapeEvents(shape.id, isCurrentParent)

  return (
    <Container
      id={shape.id}
      className={'tl-shape' + (isCurrentParent ? 'tl-current-parent' : '')}
      bounds={bounds}
      rotation={shape.rotation}
    >
      <SVGContainer>
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
            events={events}
          />
        ) : (
          <RenderedShape
            shape={shape}
            utils={utils as any}
            isBinding={isBinding}
            isCurrentParent={isCurrentParent}
            isEditing={isEditing}
            isHovered={isHovered}
            isSelected={isSelected}
            meta={meta as any}
            events={events}
          />
        )}
      </SVGContainer>
    </Container>
  )
}
