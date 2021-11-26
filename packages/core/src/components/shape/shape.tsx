import { useObserver } from 'mobx-react-lite'
import * as React from 'react'
import { useShapeEvents } from '~hooks'
import type { IShapeTreeNode, TLShape } from '~types'
import { RenderedShape } from './rendered-shape'
import { Container } from '~components/container'
import { useTLContext } from '~hooks'
import type { TLShapeUtil } from '~TLShapeUtil'

interface ShapeProps<T extends TLShape, M> extends IShapeTreeNode<T, M> {
  utils: TLShapeUtil<T>
}

export const Shape = function Shape<T extends TLShape, M>({
  shape,
  utils,
  meta,
  ...rest
}: ShapeProps<T, M>) {
  return useObserver(() => {
    const { callbacks } = useTLContext()
    const bounds = utils.getBounds(shape)
    const events = useShapeEvents(shape.id)

    return (
      <Container id={shape.id} bounds={bounds} rotation={shape.rotation}>
        <RenderedShape
          shape={shape}
          utils={utils}
          meta={meta}
          events={events}
          onShapeChange={callbacks.onShapeChange}
          onShapeBlur={callbacks.onShapeBlur}
          {...rest}
        />
      </Container>
    )
  })
}
