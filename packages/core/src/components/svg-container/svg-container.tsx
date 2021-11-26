import { useObserver } from 'mobx-react-lite'
import * as React from 'react'

interface SvgContainerProps extends React.SVGProps<SVGSVGElement> {
  children: React.ReactNode
}

export const SVGContainer = React.forwardRef<SVGSVGElement, SvgContainerProps>(
  function SVGContainer({ id, children, ...rest }, ref) {
    return useObserver(() => {
      return (
        <svg ref={ref} className="tl-positioned-svg" {...rest}>
          <g id={id} className="tl-centered-g">
            {children}
          </g>
        </svg>
      )
    })
  }
)
