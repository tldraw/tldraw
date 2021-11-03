import * as React from 'react'

export function SizeMediumIcon(props: React.SVGProps<SVGSVGElement>): JSX.Element {
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
        y="9.5"
        width="17"
        height="5"
        rx="0.5"
        fill="currentColor"
        stroke="currentColor"
      />
      <rect x="3" y="3" width="18" height="5" rx="1" fill="currentColor" opacity={0.3} />
    </svg>
  )
}
