import * as React from 'react'

export function Overlay({
  camera,
  children,
}: {
  camera: { point: number[]; zoom: number }
  children: React.ReactNode
}) {
  const l = 2.5 / camera.zoom
  return (
    <svg className="tl-overlay">
      <defs>
        <g id="tl-snap-point">
          <path
            className="tl-snap-point"
            d={`M ${-l},${-l} L ${l},${l} M ${-l},${l} L ${l},${-l}`}
          />
        </g>
      </defs>
      <g transform={`scale(${camera.zoom}) translate(${camera.point})`}>{children}</g>
    </svg>
  )
}
