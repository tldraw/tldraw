import * as React from 'react'
import { useBoundsHandleEvents } from '~hooks'
import { TLBounds, TLBoundsEdge } from '~types'

const edgeClassnames = {
  [TLBoundsEdge.Top]: 'tl-cursor-ns',
  [TLBoundsEdge.Right]: 'tl-cursor-ew',
  [TLBoundsEdge.Bottom]: 'tl-cursor-ns',
  [TLBoundsEdge.Left]: 'tl-cursor-ew',
}

export interface EdgeHandleProps {
  targetSize: number
  size: number
  bounds: TLBounds
  edge: TLBoundsEdge
  isHidden: boolean
}

function _TemplateToolbar({ size, isHidden, bounds, edge }: EdgeHandleProps) {
  const events = useBoundsHandleEvents(edge)

  const isHorizontal = edge === TLBoundsEdge.Top || edge === TLBoundsEdge.Bottom
  const isFarEdge = edge === TLBoundsEdge.Right || edge === TLBoundsEdge.Bottom

  const { height, width } = bounds

  return <rect fill={'red'} x={0} y={0} width={size} height={50} />
}

export const TemplateToolbar = React.memo(_TemplateToolbar)
