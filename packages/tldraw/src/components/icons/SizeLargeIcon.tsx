import * as React from 'react'

export function SizeLargeIcon(props: React.SVGProps<SVGSVGElement>): JSX.Element {
  return (
    <svg viewBox="-4 -4 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect
        x="3.5"
        y="16.5"
        width="17"
        height="4"
        rx="0.5"
        fill="currentColor"
        stroke="currentColor"
      />
      <rect
        x="3.5"
        y="10.5"
        width="17"
        height="4"
        rx="0.5"
        fill="currentColor"
        stroke="currentColor"
      />
      <rect
        x="3.5"
        y="3.5"
        width="17"
        height="5"
        rx="0.5"
        fill="currentColor"
        stroke="currentColor"
      />
    </svg>
  )
}
