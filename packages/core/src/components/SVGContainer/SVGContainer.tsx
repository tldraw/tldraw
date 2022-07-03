import { Observer } from 'mobx-react-lite'
import * as React from 'react'

interface SvgContainerProps extends React.SVGProps<SVGSVGElement> {
  children: React.ReactNode
  className?: string
  shapeStyle?: Record<string, any>
}

export const SVGContainer = React.forwardRef<SVGSVGElement, SvgContainerProps>(
  function SVGContainer({ id, className = '', children, shapeStyle, ...rest }, ref) {
    const styleAttrs = shapeStyle
      ? {
          'data-color': shapeStyle.color,
          'data-fill': shapeStyle.isFilled,
        }
      : {}
    return (
      <Observer>
        {() => (
          <svg ref={ref} className={`tl-positioned-svg ${className}`} {...rest}>
            <g id={id} className="tl-centered-g" {...styleAttrs}>
              {children}
            </g>
          </svg>
        )}
      </Observer>
    )
  }
)
