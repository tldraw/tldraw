import { forwardRef } from 'react'
import { IconProps } from '../types'

export const StretchVerticallyIcon = forwardRef<SVGSVGElement, IconProps>(
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
          d="M4.458 4.075a.736.736 0 0 0-.322 1.087c.209.315 0 .296 3.364.318l3 .02v13l-3 .02c-3.364.022-3.155.003-3.364.318a.736.736 0 0 0 .322 1.087c.155.07.467.073 7.542.073s7.387-.003 7.542-.073a.736.736 0 0 0 .322-1.087c-.209-.315 0-.296-3.364-.318l-3-.02v-13l3-.02c3.364-.022 3.155-.003 3.364-.318a.736.736 0 0 0-.322-1.087c-.155-.07-.467-.073-7.542-.073s-7.387.003-7.542.073"
          fill={color}
          fill-rule="evenodd"
        />
      </svg>
    )
  }
)
