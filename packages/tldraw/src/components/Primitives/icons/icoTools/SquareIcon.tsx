import { forwardRef } from 'react'
import { IconProps } from '../types'

export const SquareIcon = forwardRef<SVGSVGElement, IconProps>(
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
          d="M4.667 4.065a.928.928 0 0 0-.368.233C3.976 4.622 4 4.011 4 12c0 7.991-.024 7.369.303 7.697.328.327-.294.303 7.697.303s7.369.024 7.697-.303c.327-.328.303.294.303-7.697s.024-7.369-.303-7.697c-.328-.328.297-.303-7.714-.3-6.178.002-7.149.01-7.316.062M18.5 12v6.5h-13l-.01-6.46c-.006-3.553-.002-6.483.009-6.51.015-.04 1.338-.048 6.51-.04l6.491.01V12"
          fill={color}
          fill-rule="evenodd"
        />
      </svg>
    )
  }
)
