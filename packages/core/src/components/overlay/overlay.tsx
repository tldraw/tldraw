import * as React from 'react'

export function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <svg className="tl-overlay">
      <defs>
        <g id="tl-snap-point">
          <path className="tl-snap-point" d="M -2,-2 L 2,2 M -2,2 L 2,-2" />
        </g>
      </defs>
      {children}
    </svg>
  )
}
