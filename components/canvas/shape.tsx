import React, { useRef, memo } from 'react'
import { useSelector } from 'state'
import styled from 'styles'
import { getShapeUtils } from 'lib/shape-utils'
import { getPage } from 'utils/utils'
import { DashStyle, ShapeStyles } from 'types'
import useShapeEvents from 'hooks/useShapeEvents'
import { shades, strokes } from 'lib/colors'

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
  translate(${shape.point})
  `

  return (
    <StyledGroup
      ref={rGroup}
      isHovered={isHovered}
      isSelected={isSelected}
      transform={transform}
      stroke={'red'}
      strokeWidth={10}
    >
      {isSelecting && (
        <HoverIndicator
          as="use"
          href={'#' + id}
          strokeWidth={+shape.style.strokeWidth + 8}
          variant={shape.style.fill === 'none' ? 'hollow' : 'filled'}
          {...events}
        />
      )}
      {!shape.isHidden && (
        <RealShape id={id} style={sanitizeStyle(shape.style)} />
      )}
    </StyledGroup>
  )
}

const RealShape = memo(({ id, style }: { id: string; style: ShapeStyles }) => {
  return (
    <StyledShape
      as="use"
      href={'#' + id}
      {...style}
      strokeDasharray={getDash(style.dash, +style.strokeWidth)}
    />
  )
})

const StyledShape = styled('path', {
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
})

const HoverIndicator = styled('path', {
  fill: 'transparent',
  stroke: 'transparent',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  transform: 'all .2s',
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
  pointerEvents: 'none',
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
          opacity: '.4',
          stroke: '$selected',
        },
      },
    },
    {
      isSelected: true,
      isHovered: false,
      css: {
        [`& ${HoverIndicator}`]: {
          opacity: '.2',
          stroke: '$selected',
        },
      },
    },
    {
      isSelected: false,
      isHovered: true,
      css: {
        [`& ${HoverIndicator}`]: {
          opacity: '.2',
          stroke: '$selected',
        },
      },
    },
  ],
})

function Label({ text }: { text: string }) {
  return (
    <text
      y={4}
      x={4}
      fontSize={18}
      fill="black"
      stroke="none"
      alignmentBaseline="text-before-edge"
      pointerEvents="none"
    >
      {text}
    </text>
  )
}

function getDash(dash: DashStyle, s: number) {
  switch (dash) {
    case DashStyle.Solid: {
      return 'none'
    }
    case DashStyle.Dashed: {
      return `${s} ${s * 2}`
    }
    case DashStyle.Dotted: {
      return `0 ${s * 1.5}`
    }
  }
}

function sanitizeStyle(style: ShapeStyles) {
  const next = { ...style }
  return next
}

export { HoverIndicator }

export default memo(Shape)
