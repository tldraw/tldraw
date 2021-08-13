import * as React from 'react'
import { useHandleEvents } from '+hooks'

interface HandleProps {
  id: string
  point: number[]
  zoom: number
}

export const Handle = React.memo(({ id, point, zoom }: HandleProps) => {
  const events = useHandleEvents(id)

  return (
    <g className="tl-handles" transform={`translate(${point})`} {...events}>
      <circle
        id="handle-bg"
        className="tl-handle-bg"
        pointerEvents="all"
        r={20 / Math.max(1, zoom)}
      />
      <use href="#handle" />
    </g>
  )
})
