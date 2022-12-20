import { forwardRef } from 'react'
import { IconProps } from '../types'

export const AlignBottomIcon = forwardRef<SVGSVGElement, IconProps>(
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
          d="M11.601 4.064a1.515 1.515 0 0 0-.97.839l-.091.197-.02 6.7-.02 6.7-3 .02c-3.364.022-3.155.003-3.364.318a.736.736 0 0 0 .322 1.087c.155.07.467.073 7.542.073s7.387-.003 7.542-.073a.736.736 0 0 0 .322-1.087c-.209-.315 0-.296-3.364-.318l-3-.02-.02-6.7-.02-6.7-.091-.197a1.496 1.496 0 0 0-.988-.841 1.354 1.354 0 0 0-.78.002"
          fill={color}
          fill-rule="evenodd"
        />
      </svg>
    )
  }
)
