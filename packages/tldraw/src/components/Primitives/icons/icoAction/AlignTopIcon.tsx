import React, { forwardRef } from 'react'
import { IconProps } from '../types'

export const AlignTopIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M4.458 4.075a.736.736 0 0 0-.322 1.087c.209.315 0 .296 3.364.318l3 .02.02 6.7.02 6.7.108.229c.129.276.423.581.678.704a1.505 1.505 0 0 0 2.026-.704l.108-.229.02-6.7.02-6.7 3-.02c3.364-.022 3.155-.003 3.364-.318a.736.736 0 0 0-.322-1.087c-.155-.07-.467-.073-7.542-.073s-7.387.003-7.542.073"
          fill={color}
          fillRule="evenodd"
        />
      </svg>
    )
  }
)
