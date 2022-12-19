import { forwardRef } from 'react'
import { IconProps } from './types'

export const UndoBackIcon = forwardRef<SVGSVGElement, IconProps>(
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
          d="M4.64957 1.51611L0.751953 5.519M0.751953 5.519L4.64957 9.52139M0.751953 5.519H10.0416C11.7779 5.52923 15.2504 6.3419 15.2504 10.4844"
          stroke={color}
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    )
  }
)
