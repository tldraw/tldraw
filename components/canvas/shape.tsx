import React, { useRef, memo, useEffect } from 'react'
import state, { useSelector } from 'state'
import styled from 'styles'
import { getShapeUtils } from 'state/shape-utils'
import { deepCompareArrays } from 'utils'
import tld from 'utils/tld'
import useShapeEvents from 'hooks/useShapeEvents'
import useShape from 'hooks/useShape'
import vec from 'utils/vec'
import { getShapeStyle } from 'state/shape-styles'
import { Shape as _Shape } from 'types'

interface ShapeProps {
  shape: _Shape
  parent?: _Shape
}

function Shape({ shape, parent }: ShapeProps): JSX.Element {
  const rGroup = useRef<SVGGElement>(null)

  const { id, isHidden, children } = shape
  const style = getShapeStyle(shape.style)
  const { strokeWidth } = style

  const center = getShapeUtils(shape).getCenter(shape)
  const rotation = shape.rotation * (180 / Math.PI)
  const parentPoint = parent?.point || [0, 0]

  const transform = `
      translate(${vec.neg(parentPoint)})
      rotate(${rotation}, ${center})
      translate(${shape.point})
  `

  const isCurrentParent = false

  const events = useShapeEvents(shape.id, isCurrentParent, rGroup)

  // From here on, not reactive—if we're here, we can trust that the
  // shape in state is a shape with changes that we need to render.

  const { isParent, isForeignObject, canStyleFill } = getShapeUtils(shape)

  return (
    <StyledGroup
      id={id + '-group'}
      ref={rGroup}
      transform={transform}
      isCurrentParent={isCurrentParent}
      {...events}
    >
      {isForeignObject ? (
        <ForeignObjectHover id={id} />
      ) : (
        <EventSoak
          as="use"
          href={'#' + id}
          strokeWidth={strokeWidth + 8}
          variant={canStyleFill ? 'filled' : 'hollow'}
        />
      )}

      {!isHidden &&
        (isForeignObject ? (
          <ForeignObjectRender id={id} />
        ) : (
          <RealShape
            id={id}
            isParent={isParent}
            shape={shape}
            strokeWidth={strokeWidth}
          />
        ))}

      {isParent &&
        children.map((shapeId) => (
          <Shape
            key={shapeId}
            shape={tld.getShape(state.data, shapeId)}
            parent={shape}
          />
        ))}
    </StyledGroup>
  )
}

export default memo(Shape)

// function Def({ id }: { id: string }) {
//   const shape = useShape(id)
//   if (!shape) return null
//   return getShapeUtils(shape).render(shape, { isEditing: false })
// }

interface RealShapeProps {
  id: string
  isParent: boolean
  strokeWidth: number
  shape: _Shape
}

const RealShape = memo(
  function RealShape({ shape }: RealShapeProps) {
    return getShapeUtils(shape).render(shape, { isEditing: false })
  },
  (prev, next) => {
    return (
      prev.shape &&
      next.shape &&
      next.shape !== prev.shape &&
      getShapeUtils(next.shape).shouldRender(next.shape, prev.shape)
    )
  }
)

const ForeignObjectHover = memo(function ForeignObjectHover({
  id,
}: {
  id: string
}) {
  const size = useSelector((s) => {
    const shape = tld.getPage(s.data).shapes[id]
    if (shape === undefined) return [0, 0]
    const bounds = getShapeUtils(shape).getBounds(shape)

    return [bounds.width, bounds.height]
  }, deepCompareArrays)

  return (
    <EventSoak
      as="rect"
      width={size[0]}
      height={size[1]}
      strokeWidth={1.5}
      variant={'ghost'}
    />
  )
})

const ForeignObjectRender = memo(function ForeignObjectRender({
  id,
}: {
  id: string
}) {
  const shape = useShape(id)

  const rFocusable = useRef<HTMLTextAreaElement>(null)

  const isEditing = useSelector((s) => s.data.editingId === id)

  useEffect(() => {
    if (isEditing) {
      setTimeout(() => {
        const elm = rFocusable.current
        if (!elm) return
        elm.focus()
      }, 0)
    }
  }, [isEditing])

  if (shape === undefined) return null

  return getShapeUtils(shape).render(shape, { isEditing, ref: rFocusable })
})

const EventSoak = styled('use', {
  opacity: 0,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  variants: {
    variant: {
      ghost: {
        pointerEvents: 'all',
        filter: 'none',
        opacity: 0,
      },
      hollow: {
        pointerEvents: 'stroke',
      },
      filled: {
        pointerEvents: 'all',
      },
    },
  },
})

const StyledGroup = styled('g', {
  outline: 'none',

  '& > *[data-shy=true]': {
    opacity: 0,
  },

  '&:hover': {
    '& > *[data-shy=true]': {
      opacity: 1,
    },
  },

  variants: {
    isCurrentParent: {
      true: {
        '& > *[data-shy=true]': {
          opacity: 1,
        },
      },
    },
  },
})
