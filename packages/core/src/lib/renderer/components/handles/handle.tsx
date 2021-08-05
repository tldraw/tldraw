import * as React from 'react'
import { useHandleEvents } from '../../hooks'
import { useRef } from 'react'

interface HandleProps {
  id: string
  point: number[]
}

export const Handle = React.memo(({ id, point }: HandleProps) => {
  const events = useHandleEvents(id)

  return (
    <g
      key={id}
      className="handles"
      pointerEvents="all"
      transform={`translate(${point})`}
      {...events}
    >
      <circle className="tl-handle-bg" r={12} />
      <use href="#handle" pointerEvents="none" />
    </g>
  )
})
