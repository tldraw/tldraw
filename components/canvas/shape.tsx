import React, { useRef, memo } from 'react'
import { useSelector } from 'state'
import styled from 'styles'
import { getShapeUtils } from 'lib/shape-utils'
import { getBoundsCenter, getPage } from 'utils/utils'
import { ShapeStyles, ShapeType } from 'types'
import useShapeEvents from 'hooks/useShapeEvents'
import * as vec from 'utils/vec'
import { getShapeStyle } from 'lib/shape-styles'
import ContextMenu from 'components/context-menu'

interface ShapeProps {
  id: string
  isSelecting: boolean
  parentPoint: number[]
}

function Shape({ id, isSelecting, parentPoint }: ShapeProps) {
  const shape = useSelector((s) => getPage(s.data).shapes[id])

  const rGroup = useRef<SVGGElement>(null)

  const events = useShapeEvents(id, shape?.type === ShapeType.Group, rGroup)

  // This is a problem with deleted shapes. The hooks in this component
  // may sometimes run before the hook in the Page component, which means
  // a deleted shape will still be pulled here before the page component
  // detects the change and pulls this component.
  if (!shape) return null

  const isGroup = shape.type === ShapeType.Group

  const center = getShapeUtils(shape).getCenter(shape)
  const rotation = shape.rotation * (180 / Math.PI)

  const transform = `
  translate(${vec.neg(parentPoint)})
  rotate(${rotation}, ${center})
  translate(${shape.point})
  `

  const style = getShapeStyle(shape.style)

  return (
    <StyledGroup ref={rGroup} transform={transform}>
      {isSelecting && !isGroup && (
        <HoverIndicator
          as="use"
          href={'#' + id}
          strokeWidth={+style.strokeWidth + 4}
          variant={getShapeUtils(shape).canStyleFill ? 'filled' : 'hollow'}
          {...events}
        />
      )}

      {!shape.isHidden && <RealShape isGroup={isGroup} id={id} style={style} />}
      {isGroup &&
        shape.children.map((shapeId) => (
          <Shape
            key={shapeId}
            id={shapeId}
            isSelecting={isSelecting}
            parentPoint={shape.point}
          />
        ))}
    </StyledGroup>
  )
}

interface RealShapeProps {
  isGroup: boolean
  id: string
  style: Partial<React.SVGProps<SVGUseElement>>
}

const RealShape = memo(function RealShape({
  isGroup,
  id,
  style,
}: RealShapeProps) {
  return <StyledShape as="use" data-shy={isGroup} href={'#' + id} {...style} />
})

const StyledShape = styled('path', {
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  pointerEvents: 'none',
})

const HoverIndicator = styled('path', {
  stroke: '$selected',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  transform: 'all .2s',
  fill: 'transparent',
  filter: 'url(#expand)',
  variants: {
    variant: {
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
  [`& *[data-shy="true"]`]: {
    opacity: '0',
  },
  [`& ${HoverIndicator}`]: {
    opacity: '0',
  },
  [`&:hover ${HoverIndicator}`]: {
    opacity: '0.16',
  },
  [`&:hover *[data-shy="true"]`]: {
    opacity: '1',
  },
  variants: {
    isSelected: {
      true: {
        [`& *[data-shy="true"]`]: {
          opacity: '1',
        },
        [`& ${HoverIndicator}`]: {
          opacity: '0.2',
        },
        [`&:hover ${HoverIndicator}`]: {
          opacity: '0.3',
        },
        [`&:active ${HoverIndicator}`]: {
          opacity: '0.3',
        },
      },
      false: {
        [`& ${HoverIndicator}`]: {
          opacity: '0',
        },
      },
    },
  },
})

function Label({ children }: { children: React.ReactNode }) {
  return (
    <text
      y={4}
      x={4}
      fontSize={12}
      fill="black"
      stroke="none"
      alignmentBaseline="text-before-edge"
      pointerEvents="none"
    >
      {children}
    </text>
  )
}

function pp(n: number[]) {
  return '[' + n.map((v) => v.toFixed(1)).join(', ') + ']'
}

export { HoverIndicator }

export default memo(Shape)
