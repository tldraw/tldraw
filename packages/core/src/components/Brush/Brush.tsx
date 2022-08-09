import { observer } from 'mobx-react-lite'
import * as React from 'react'
import { SVGContainer } from '~components'
import { Container } from '~components/Container'
import type { TLBounds } from '~types'
import Utils from '~utils'

export const Brush = observer<{
  brush: TLBounds
  zoom: number
  dashed: boolean | null | undefined
}>(function Brush({ brush, zoom, dashed }) {
  return (
    <Container bounds={brush} rotation={0}>
      <SVGContainer>
        <rect
          className={'tl-brush' + (dashed ? ' dashed' : '')}
          opacity={1}
          x={0}
          y={0}
          width={brush.width}
          height={brush.height}
          aria-label="brush"
        />
        {dashed && (
          <g className="tl-dashed-brush-line">
            <PerfectDashLine x1={0} y1={0} x2={brush.width} y2={0} zoom={zoom} />
            <PerfectDashLine
              x1={brush.width}
              y1={0}
              x2={brush.width}
              y2={brush.height}
              zoom={zoom}
            />
            <PerfectDashLine
              x1={0}
              y1={brush.height}
              x2={brush.width}
              y2={brush.height}
              zoom={zoom}
            />
            <PerfectDashLine x1={0} y1={0} x2={0} y2={brush.height} zoom={zoom} />
          </g>
        )}
      </SVGContainer>
    </Container>
  )
})

interface PerfectDashLineProps {
  x1: number
  y1: number
  x2: number
  y2: number
  zoom: number
}

function PerfectDashLine({ x1, y1, x2, y2, zoom }: PerfectDashLineProps) {
  const dash = Utils.getPerfectDashProps(
    Math.hypot(x2 - x1, y2 - y1),
    1 / zoom,
    'dashed',
    1,
    true,
    3
  )
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      strokeWidth={1 / zoom}
      strokeDasharray={dash.strokeDasharray}
      strokeDashoffset={dash.strokeDashoffset}
    />
  )
}
