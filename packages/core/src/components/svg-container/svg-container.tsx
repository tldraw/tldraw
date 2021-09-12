import * as React from 'react'

interface SvgContainerProps extends React.SVGProps<SVGSVGElement> {
  children: React.ReactNode
}

export const SVGContainer = React.memo(
  React.forwardRef<SVGSVGElement, SvgContainerProps>(({ children, ...rest }, ref) => {
    return (
      <svg ref={ref} className="tl-positioned-svg" {...rest}>
        <g className="tl-centered-g">{children}</g>
      </svg>
    )
  })
)
