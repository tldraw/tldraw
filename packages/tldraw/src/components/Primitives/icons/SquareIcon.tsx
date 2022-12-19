import { forwardRef } from 'react'
import { IconProps } from './types'

export const SquareIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ color = 'currentColor', ...props }, forwardedRef) => {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M0.745 0.036 C 0.470 0.111,0.214 0.333,0.084 0.609 L 0.013 0.760 0.013 8.001 L 0.013 15.241 0.100 15.417 C 0.204 15.628,0.395 15.815,0.608 15.915 L 0.760 15.987 8.001 15.987 L 15.241 15.987 15.417 15.900 C 15.628 15.796,15.815 15.605,15.915 15.392 L 15.987 15.240 15.987 8.000 L 15.987 0.760 15.915 0.608 C 15.815 0.395,15.628 0.204,15.417 0.100 L 15.241 0.013 8.054 0.008 C 2.415 0.004,0.840 0.010,0.745 0.036 M14.507 8.000 L 14.507 14.507 8.000 14.507 L 1.493 14.507 1.493 8.000 L 1.493 1.493 8.000 1.493 L 14.507 1.493 14.507 8.000 "
          stroke="none"
          fill={color}
          fill-rule="evenodd"
        ></path>
      </svg>
    )
  }
)
