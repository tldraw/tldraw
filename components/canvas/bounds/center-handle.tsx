import styled from 'styles'
import { Bounds } from 'types'

export default function CenterHandle({
  bounds,
  isLocked,
}: {
  bounds: Bounds
  isLocked: boolean
}): JSX.Element {
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
  zStrokeWidth: 1.5,

  variants: {
    isLocked: {
      true: {
        zStrokeWidth: 1.5,
        zDash: 2,
      },
    },
  },
})
