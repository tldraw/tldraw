import { observer } from 'mobx-react-lite'
import * as React from 'react'
import type { TLShapeUtil } from '~TLShapeUtil'
import { Container } from '~components/Container'
import { useShapeEvents } from '~hooks'
import { useTLContext } from '~hooks'
import type { IShapeTreeNode, TLShape } from '~types'
import { RenderedShape } from './RenderedShape'

interface ShapeProps<T extends TLShape, E extends Element, M> extends IShapeTreeNode<T, M> {
  utils: TLShapeUtil<T, E, M>
}

export const Shape = observer(function Shape<T extends TLShape, E extends Element, M>({
  shape,
  utils,
  meta,
  ...rest
}: ShapeProps<T, E, M>) {
  const { callbacks } = useTLContext()
  const bounds = utils.getBounds(shape)
  const events = useShapeEvents(shape.id)

  return (
    <Container
      id={shape.id}
      bounds={bounds}
      rotation={shape.rotation}
      data-shape={shape.type}
      isGhost={rest.isGhost}
      isSelected={rest.isSelected}
    >
      <RenderedShape
        shape={shape}
        utils={utils as any}
        meta={meta}
        events={events}
        bounds={bounds}
        onShapeChange={callbacks.onShapeChange}
        onShapeBlur={callbacks.onShapeBlur}
        {...rest}
      />
    </Container>
  )
})
