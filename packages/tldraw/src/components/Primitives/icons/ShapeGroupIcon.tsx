import { forwardRef } from 'react'
import { IconProps } from './types'

export const ShapeGroupIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ color = 'currentColor', ...props }, forwardedRef) => {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <rect
          x="0.749023"
          y="5.25"
          width="10"
          height="10"
          rx="2"
          stroke={color}
          stroke-width="1.5"
          stroke-linejoin="round"
        />
        <path
          d="M5.24121 5.16937C5.53183 2.68116 7.65284 0.75 10.2262 0.75C12.9981 0.75 15.2451 2.99061 15.2451 5.75455C15.2451 7.8974 13.8945 9.7257 11.9957 10.4392C11.6382 10.5735 11.2612 10.6683 10.8701 10.7183"
          stroke={color}
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
    )
  }
)
