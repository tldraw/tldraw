import useHandleEvents from 'hooks/useBoundsHandleEvents'
import styled from 'styles'
import { Edge, Bounds } from 'types'

export default function EdgeHandle({
  size,
  bounds,
  edge,
}: {
  size: number
  bounds: Bounds
  edge: Edge
}) {
  const events = useHandleEvents(edge)

  const isHorizontal = edge === Edge.Top || edge === Edge.Bottom
  const isFarEdge = edge === Edge.Right || edge === Edge.Bottom

  const { height, width } = bounds

  return (
    <StyledEdge
      edge={edge}
      x={isHorizontal ? size / 2 : (isFarEdge ? width + 1 : -1) - size / 2}
      y={isHorizontal ? (isFarEdge ? height + 1 : -1) - size / 2 : size / 2}
      width={isHorizontal ? Math.max(0, width + 1 - size) : size}
      height={isHorizontal ? size : Math.max(0, height + 1 - size)}
      {...events}
    />
  )
}

const StyledEdge = styled('rect', {
  stroke: 'none',
  fill: 'none',
  variants: {
    edge: {
      [Edge.Top]: { cursor: 'ns-resize' },
      [Edge.Right]: { cursor: 'ew-resize' },
      [Edge.Bottom]: { cursor: 'ns-resize' },
      [Edge.Left]: { cursor: 'ew-resize' },
    },
  },
})
