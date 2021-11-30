import * as React from 'react'
import { Observer } from 'mobx-react-lite'

interface SvgContainerProps extends React.SVGProps<SVGSVGElement> {
  children: React.ReactNode
  className?: string
}

export const SVGContainer = React.forwardRef<SVGSVGElement, SvgContainerProps>(
  function SVGContainer({ id, className = '', children, ...rest }, ref) {
    return (
      <Observer>
        {() => (
          <svg ref={ref} className={`nu-positioned-svg ${className}`} {...rest}>
            <g id={id} className="nu-centered-g">
              {children}
            </g>
          </svg>
        )}
      </Observer>
    )
  }
)
