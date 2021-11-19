import * as React from 'react'

const dottedDasharray = `${50.26548 * 0.025} ${50.26548 * 0.1}`

export function DashDottedIcon(): JSX.Element {
  return (
    <svg width="24" height="24" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
      <circle
        cx={12}
        cy={12}
        r={8}
        fill="none"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray={dottedDasharray}
      />
    </svg>
  )
}
