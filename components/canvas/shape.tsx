import React, { useRef, memo } from 'react'
import { useSelector } from 'state'
import styled from 'styles'
import { getShapeUtils } from 'lib/shape-utils'
import { getPage } from 'utils/utils'
import { DashStyle, ShapeStyles } from 'types'
import useShapeEvents from 'hooks/useShapeEvents'
import { getShapeStyle } from 'lib/shape-styles'

function Shape({ id, isSelecting }: { id: string; isSelecting: boolean }) {
  const isSelected = useSelector((s) => s.values.selectedIds.has(id))

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

  const style = getShapeStyle(shape.style)

  return (
    <StyledGroup ref={rGroup} isSelected={isSelected} transform={transform}>
      {isSelecting && (
        <HoverIndicator
          as="use"
          href={'#' + id}
          strokeWidth={+style.strokeWidth + 4}
          variant={getShapeUtils(shape).canStyleFill ? 'filled' : 'hollow'}
          {...events}
        />
      )}
      {!shape.isHidden && <RealShape id={id} style={style} />}
    </StyledGroup>
  )
}

const RealShape = memo(
  ({ id, style }: { id: string; style: ReturnType<typeof getShapeStyle> }) => {
    return <StyledShape as="use" href={'#' + id} {...style} />
  }
)

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
  [`& ${HoverIndicator}`]: {
    opacity: '0',
  },
  variants: {
    isSelected: {
      true: {
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
        [`&:hover ${HoverIndicator}`]: {
          opacity: '0.16',
        },
      },
    },
  },
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

export { HoverIndicator }

export default memo(Shape)
