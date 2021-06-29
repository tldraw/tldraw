import React, { useRef, memo, useEffect } from 'react'
import state, { useSelector } from 'state'
import styled from 'styles'
import { getShapeUtils } from 'state/shape-utils'
import { deepCompareArrays } from 'utils'
import tld from 'utils/tld'
import useShapeEvents from 'hooks/useShapeEvents'
import vec from 'utils/vec'
import { getShapeStyle } from 'state/shape-styles'
import useShapeDef from 'hooks/useShape'
import { ShapeUtility } from 'types'

interface ShapeProps {
  id: string
  isSelecting: boolean
}

function Shape({ id, isSelecting }: ShapeProps): JSX.Element {
  const rGroup = useRef<SVGGElement>(null)

  const isHidden = useSelector((s) => {
    const shape = tld.getShape(s.data, id)
    if (shape === undefined) return true
    return shape?.isHidden
  })

  const children = useSelector((s) => {
    const shape = tld.getShape(s.data, id)
    if (shape === undefined) return []
    return shape?.children
  }, deepCompareArrays)

  const strokeWidth = useSelector((s) => {
    const shape = tld.getShape(s.data, id)
    if (shape === undefined) return 0
    const style = getShapeStyle(shape?.style)
    return +style.strokeWidth
  })

  const transform = useSelector((s) => {
    const shape = tld.getShape(s.data, id)
    if (shape === undefined) return ''
    const center = getShapeUtils(shape).getCenter(shape)
    const rotation = shape.rotation * (180 / Math.PI)
    const parentPoint = tld.getShape(s.data, shape.parentId)?.point || [0, 0]

    return `
      translate(${vec.neg(parentPoint)})
      rotate(${rotation}, ${center})
      translate(${shape.point})
  `
  })

  // From here on, not reactive—if we're here, we can trust that the
  // shape in state is a shape with changes that we need to render.

  const shape = tld.getShape(state.data, id)

  const shapeUtils = shape ? getShapeUtils(shape) : ({} as ShapeUtility<any>)

  const {
    isParent = false,
    isForeignObject = false,
    canStyleFill = false,
  } = shapeUtils

  const events = useShapeEvents(id, isParent, rGroup)

  if (!shape) return null

  return (
    <StyledGroup
      id={id + '-group'}
      ref={rGroup}
      transform={transform}
      {...events}
    >
      {isSelecting &&
        (isForeignObject ? (
          <ForeignObjectHover id={id} />
        ) : (
          <EventSoak
            as="use"
            href={'#' + id}
            strokeWidth={strokeWidth + 8}
            variant={canStyleFill ? 'filled' : 'hollow'}
          />
        ))}

      {!isHidden &&
        (isForeignObject ? (
          <ForeignObjectRender id={id} />
        ) : (
          <RealShape id={id} isParent={isParent} strokeWidth={strokeWidth} />
        ))}

      {isParent &&
        children.map((shapeId) => (
          <Shape key={shapeId} id={shapeId} isSelecting={isSelecting} />
        ))}
    </StyledGroup>
  )
}

export default memo(Shape)

interface RealShapeProps {
  id: string
  isParent: boolean
  strokeWidth: number
}

const RealShape = memo(function RealShape({
  id,
  isParent,
  strokeWidth,
}: RealShapeProps) {
  return (
    <StyledShape
      as="use"
      data-shy={isParent}
      href={'#' + id}
      strokeWidth={strokeWidth}
    />
  )
})

const ForeignObjectHover = memo(function ForeignObjectHover({
  id,
}: {
  id: string
}) {
  const size = useSelector((s) => {
    const shape = tld.getPage(s.data).shapes[id]
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
  const shape = useShapeDef(id)

  const rFocusable = useRef<HTMLTextAreaElement>(null)

  const isEditing = useSelector((s) => s.data.editingId === id)

  const shapeUtils = getShapeUtils(shape)

  useEffect(() => {
    if (isEditing) {
      setTimeout(() => {
        const elm = rFocusable.current
        if (!elm) return
        elm.focus()
      }, 0)
    }
  }, [isEditing])

  return shapeUtils.render(shape, { isEditing, ref: rFocusable })
})

const StyledShape = styled('path', {
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  pointerEvents: 'none',
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
})
