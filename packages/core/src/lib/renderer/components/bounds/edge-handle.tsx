import useBoundsEvents from '../../hooks/useBoundsEvents'
import { Edge, Bounds } from '../../../types'

const edgeClassnames = {
  [Edge.Top]: 'tl-transparent tl-cursor-ns',
  [Edge.Right]: 'tl-transparent tl-cursor-ew',
  [Edge.Bottom]: 'tl-transparent tl-cursor-ns',
  [Edge.Left]: 'tl-transparent tl-cursor-ew',
}

export default function EdgeHandle({
  size,
  bounds,
  edge,
}: {
  size: number
  bounds: Bounds
  edge: Edge
}): JSX.Element {
  const events = useBoundsEvents(edge)

  const isHorizontal = edge === Edge.Top || edge === Edge.Bottom
  const isFarEdge = edge === Edge.Right || edge === Edge.Bottom

  const { height, width } = bounds

  return (
    <rect
      className={edgeClassnames[edge]}
      x={isHorizontal ? size / 2 : (isFarEdge ? width + 1 : -1) - size / 2}
      y={isHorizontal ? (isFarEdge ? height + 1 : -1) - size / 2 : size / 2}
      width={isHorizontal ? Math.max(0, width + 1 - size) : size}
      height={isHorizontal ? size : Math.max(0, height + 1 - size)}
      {...events}
    />
  )
}
