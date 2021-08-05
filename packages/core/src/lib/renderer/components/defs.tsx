import * as React from 'react'

interface DefProps {
  zoom: number
}

export function Defs({ zoom }: DefProps): JSX.Element {
  return (
    <defs>
      <circle id="dot" className="tl-counter-scaled tl-dot" r={4} />
      <circle id="handle" className="tl-counter-scaled tl-handle" r={4} />
      <g id="cross" className="tl-binding-indicator">
        <line x1={-6} y1={-6} x2={6} y2={6} />
        <line x1={6} y1={-6} x2={-6} y2={6} />
      </g>
      <filter id="expand">
        <feMorphology operator="dilate" radius={0.5 / zoom} />
      </filter>
    </defs>
  )
}
