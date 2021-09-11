import * as React from 'react'

interface SvgContainerProps {
  children: React.ReactNode
}

export const SVGContainer = React.memo(({ children }: SvgContainerProps) => {
  return (
    <svg className="tl-positioned-svg">
      <g className="tl-centered-g">{children}</g>
    </svg>
  )
})
