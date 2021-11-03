import * as React from 'react'

export function BoxIcon({
  fill = 'none',
  stroke = 'currentColor',
}: {
  fill?: string
  stroke?: string
}): JSX.Element {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      stroke={stroke}
      fill={fill}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="2" />
    </svg>
  )
}
