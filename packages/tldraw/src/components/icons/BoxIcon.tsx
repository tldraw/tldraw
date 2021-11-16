import * as React from 'react'

export function BoxIcon({
  fill = 'none',
  stroke = 'currentColor',
  strokeWidth = 2,
}: {
  fill?: string
  stroke?: string
  strokeWidth?: number
}): JSX.Element {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      stroke={stroke}
      strokeWidth={strokeWidth}
      fill={fill}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  )
}
