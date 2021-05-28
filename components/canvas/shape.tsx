import React, { useRef, memo } from 'react'
import { useSelector } from 'state'
import styled from 'styles'
import { getShapeUtils } from 'lib/shape-utils'
import { getPage } from 'utils/utils'
import { ShapeStyles } from 'types'
import useShapeEvents from 'hooks/useShapeEvents'

function Shape({ id, isSelecting }: { id: string; isSelecting: boolean }) {
  const isHovered = useSelector((state) => state.data.hoveredId === id)

  const isSelected = useSelector((state) => state.values.selectedIds.has(id))

  const shape = useSelector(({ data }) => getPage(data).shapes[id])

  const rGroup = useRef<SVGGElement>(null)

  const events = useShapeEvents(id, rGroup)

  // This is a problem with deleted shapes. The hooks in this component
  // may sometimes run before the hook in the Page component, which means
  // a deleted shape will still be pulled here before the page component
  // detects the change and pulls this component.
  if (!shape) return null

  const center = getShapeUtils(shape).getCenter(shape)
  const transform = `
  rotate(${shape.rotation * (180 / Math.PI)}, ${center})
  translate(${shape.point})`

  return (
    <StyledGroup
      ref={rGroup}
      isHovered={isHovered}
      isSelected={isSelected}
      transform={transform}
      {...events}
    >
      {isSelecting && (
        <HoverIndicator
          as="use"
          href={'#' + id}
          strokeWidth={+shape.style.strokeWidth + 8}
        />
      )}
      <StyledShape id={id} style={shape.style} />
      {/* 
      <text
        y={4}
        x={4}
        fontSize={18}
        fill="black"
        stroke="none"
        alignmentBaseline="text-before-edge"
        pointerEvents="none"
      >
        {center.toString()}
      </text> */}
    </StyledGroup>
  )
}

const StyledShape = memo(
  ({ id, style }: { id: string; style: ShapeStyles }) => {
    return (
      <MainShape
        as="use"
        href={'#' + id}
        {...style}
        // css={{ zStrokeWidth: Number(style.strokeWidth) }}
      />
    )
  }
)

const MainShape = styled('use', {
  // zStrokeWidth: 1,
})

const HoverIndicator = styled('path', {
  fill: 'none',
  stroke: 'transparent',
  pointerEvents: 'all',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  transform: 'all .2s',
})

const StyledGroup = styled('g', {
  [`& ${HoverIndicator}`]: {
    opacity: '0',
  },
  variants: {
    isSelected: {
      true: {},
      false: {},
    },
    isHovered: {
      true: {},
      false: {},
    },
  },
  compoundVariants: [
    {
      isSelected: true,
      isHovered: true,
      css: {
        [`& ${HoverIndicator}`]: {
          opacity: '1',
          stroke: '$hint',
          fill: '$hint',
          // zStrokeWidth: [8, 4],
        },
      },
    },
    {
      isSelected: true,
      isHovered: false,
      css: {
        [`& ${HoverIndicator}`]: {
          opacity: '1',
          stroke: '$hint',
          fill: '$hint',
          // zStrokeWidth: [6, 3],
        },
      },
    },
    {
      isSelected: false,
      isHovered: true,
      css: {
        [`& ${HoverIndicator}`]: {
          opacity: '1',
          stroke: '$hint',
          fill: '$hint',
          // zStrokeWidth: [8, 4],
        },
      },
    },
  ],
})

export { HoverIndicator }

export default memo(Shape)
