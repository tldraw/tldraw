import React, { forwardRef } from 'react'
import { IconProps } from '../types'

export const LineSizeBigIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M5.62 6.041c-.7.145-1.249.622-1.514 1.315l-.086.224v8.84l.088.23a2.112 2.112 0 0 0 1.248 1.244l.224.086h12.84l.23-.088a2.112 2.112 0 0 0 1.244-1.248l.086-.224V7.58l-.086-.224a2.112 2.112 0 0 0-1.244-1.248l-.23-.088-6.32-.006c-3.476-.003-6.392.009-6.48.027"
          fill={color}
          fillRule="evenodd"
        />
      </svg>
    )
  }
)
