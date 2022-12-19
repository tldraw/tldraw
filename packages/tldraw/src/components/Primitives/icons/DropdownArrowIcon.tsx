import { forwardRef } from 'react'
import { IconProps } from './types'

export const DropdownArrowIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ color = 'currentColor', ...props }, forwardedRef) => {
    return (
      <svg
        viewBox="0 0 10 5"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M1.3999 0.799805L4.99989 4.39981L8.5999 0.799805"
          stroke={color}
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    )
  }
)
