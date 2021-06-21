import useBoundsEvents from 'hooks/useBoundsEvents'
import styled from 'styles'
import { Corner, Bounds } from 'types'

export default function CornerHandle({
  size,
  corner,
  bounds,
}: {
  size: number
  bounds: Bounds
  corner: Corner
}): JSX.Element {
  const events = useBoundsEvents(corner)

  const isTop = corner === Corner.TopLeft || corner === Corner.TopRight
  const isLeft = corner === Corner.TopLeft || corner === Corner.BottomLeft

  return (
    <g>
      <StyledCorner
        corner={corner}
        x={(isLeft ? -1 : bounds.width + 1) - size}
        y={(isTop ? -1 : bounds.height + 1) - size}
        width={size * 2}
        height={size * 2}
        {...events}
      />
      <StyledCornerInner
        x={(isLeft ? -1 : bounds.width + 1) - size / 2}
        y={(isTop ? -1 : bounds.height + 1) - size / 2}
        width={size}
        height={size}
        pointerEvents="none"
      />
    </g>
  )
}

const StyledCorner = styled('rect', {
  stroke: 'none',
  fill: 'transparent',
  variants: {
    corner: {
      [Corner.TopLeft]: { cursor: 'nwse-resize' },
      [Corner.TopRight]: { cursor: 'nesw-resize' },
      [Corner.BottomRight]: { cursor: 'nwse-resize' },
      [Corner.BottomLeft]: { cursor: 'nesw-resize' },
    },
  },
})

const StyledCornerInner = styled('rect', {
  stroke: '$bounds',
  fill: '#fff',
  zStrokeWidth: 1.5,
})
