import styled from 'styles'
import { Bounds } from 'types'

export default function CenterHandle({
  bounds,
  isLocked,
}: {
  bounds: Bounds
  isLocked: boolean
}) {
  return (
    <StyledBounds
      x={-1}
      y={-1}
      width={bounds.width + 2}
      height={bounds.height + 2}
      pointerEvents="none"
      isLocked={isLocked}
    />
  )
}

const StyledBounds = styled('rect', {
  fill: 'none',
  stroke: '$bounds',
  zStrokeWidth: 2,

  variants: {
    isLocked: {
      true: {
        zStrokeWidth: 1,
        zDash: 2,
      },
    },
  },
})
