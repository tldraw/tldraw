import { forwardRef } from 'react'
import { IconProps } from '../types'

export const LineSizeLargeIcon = forwardRef<SVGSVGElement, IconProps>(
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
          d="M5.62 7.041c-.7.145-1.249.622-1.514 1.315-.086.223-.086.242-.086 3.644s0 3.421.086 3.644c.226.59.659 1.025 1.244 1.248l.23.088h12.84l.23-.088a2.112 2.112 0 0 0 1.244-1.248c.086-.223.086-.242.086-3.644s0-3.421-.086-3.644a2.112 2.112 0 0 0-1.244-1.248l-.23-.088-6.32-.006c-3.476-.003-6.392.009-6.48.027"
          fill={color}
          fill-rule="evenodd"
        />
      </svg>
    )
  }
)
