import { forwardRef } from 'react'
import { IconProps } from './types'

export const UndoForwardIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ color = 'currentColor', ...props }, forwardedRef) => {
    return (
      <svg
        width="16"
        height="12"
        viewBox="0 0 16 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M11.3504 1.51562L15.248 5.51852M15.248 5.51852L11.3504 9.5209M15.248 5.51852H5.95838C4.22211 5.52874 0.749579 6.34141 0.749579 10.4839"
          stroke={color}
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    )
  }
)
