import React, { forwardRef } from 'react'
import { IconProps } from '../types'

export const ArrowUpIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ color = 'currentColor', ...props }, forwardedRef) => {
    return (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M11.8 5.253a1.362 1.362 0 0 0-.2.089c-.033.021-1.108 1.091-2.388 2.378-2.331 2.343-2.452 2.478-2.452 2.741 0 .312.467.779.78.779.257 0 .401-.125 2.049-1.77l1.649-1.647.011 5.059c.011 4.976.012 5.06.091 5.194.16.271.451.383.842.324a.63.63 0 0 0 .478-.324c.079-.134.08-.218.091-5.194l.011-5.058 1.669 1.664c1.837 1.832 1.822 1.821 2.174 1.715.218-.065.533-.38.598-.598.108-.359.18-.273-2.397-2.865-1.29-1.298-2.401-2.39-2.467-2.427a.668.668 0 0 0-.539-.06"
          fillRule="evenodd"
          fill={color}
        />
      </svg>
    )
  }
)
