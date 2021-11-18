import * as React from 'react'

interface BindingProps {
  point: number[]
  type: string
}

export function Binding({ point: [x, y], type }: BindingProps): JSX.Element {
  return (
    <g pointerEvents="none">
      {type === 'center' && (
        <circle className="tl-binding" aria-label="binding circle" cx={x} cy={y} r={8} />
      )}
      {type !== 'pin' && (
        <use className="tl-binding" aria-label="binding cross" href="#cross" x={x} y={y} />
      )}
    </g>
  )
}
