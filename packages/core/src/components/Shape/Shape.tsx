import * as React from 'react'
import type { TLShapeUtil } from '~TLShapeUtil'
import { Container } from '~components/Container'
import { useShapeEvents } from '~hooks'
import { useTLContext } from '~hooks'
import type { IShapeTreeNode, TLShape } from '~types'
import { RenderedShape } from './RenderedShape'

export interface ShapeProps<T extends TLShape, E extends Element, M> extends IShapeTreeNode<T, M> {
  utils: TLShapeUtil<T, E, M>
}

function _Shape<T extends TLShape, E extends Element, M>({
  shape,
  utils,
  meta,
  ...rest
}: ShapeProps<T, E, M>) {
  const { callbacks } = useTLContext()
  const bounds = utils.getBounds(shape)
  const events = useShapeEvents(shape.id)

  const handleClick = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    console.log('ssss')
  }, [])

  return (
    <Container
      id={shape.id}
      bounds={bounds}
      rotation={shape.rotation}
      data-shape={shape.type}
      isGhost={rest.isGhost}
      isSelected={rest.isSelected}
      onPointerDown={handleClick}
    >
      {shape.type === 'template' && (
        <div
          style={{
            position: 'absolute',
            top: '0px',
            left: '0px',
            width: '100%',
            height: '2rem',
            backgroundColor: '#e9e9e9',
            zIndex: '1',
          }}
        >
          TEST
          <button
            type="button"
            onClick={() => {
              console.log('Click Click !!!')
            }}
          >
            test
          </button>
        </div>
      )}
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
}

export const Shape = React.memo(_Shape)
