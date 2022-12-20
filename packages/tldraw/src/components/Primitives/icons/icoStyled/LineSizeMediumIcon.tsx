import { forwardRef } from 'react'
import { IconProps } from '../types'

export const LineSizeMediumIcon = forwardRef<SVGSVGElement, IconProps>(
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
          d="M5.62 9.041c-.7.145-1.25.623-1.514 1.315-.081.213-.085.291-.085 1.644 0 1.363.004 1.429.087 1.65a2.115 2.115 0 0 0 1.248 1.244l.224.086h12.84l.23-.088a2.112 2.112 0 0 0 1.244-1.248c.081-.213.085-.291.085-1.644s-.004-1.431-.085-1.644a2.112 2.112 0 0 0-1.244-1.248l-.23-.088-6.32-.006c-3.476-.003-6.392.009-6.48.027"
          fill={color}
          fill-rule="evenodd"
        />
      </svg>
    )
  }
)
