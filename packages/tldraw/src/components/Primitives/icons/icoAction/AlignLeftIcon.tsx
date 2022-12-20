import { forwardRef } from 'react'
import { IconProps } from '../types'

export const AlignLeftIcon = forwardRef<SVGSVGElement, IconProps>(
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
          d="M4.46 4.073a.751.751 0 0 0-.398.416c-.055.132-.062.956-.061 7.52.001 7.065.004 7.378.074 7.533.195.428.7.578 1.087.322.315-.209.296 0 .318-3.364l.02-3 6.7-.02 6.7-.02.229-.108c.276-.129.581-.423.704-.678a1.505 1.505 0 0 0-.704-2.026l-.229-.108-6.7-.02-6.7-.02-.02-3c-.022-3.367-.002-3.154-.322-3.366a.725.725 0 0 0-.698-.061"
          fill={color}
          fill-rule="evenodd"
        />
      </svg>
    )
  }
)
