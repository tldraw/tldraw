import { forwardRef } from 'react'
import { IconProps } from './types'

export const Trash2Icon = forwardRef<SVGSVGElement, IconProps>(
  ({ color = 'currentColor', ...props }, forwardedRef) => {
    return (
      <svg
        width="14"
        height="16"
        viewBox="0 0 14 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M2 3H12M2 3V14C2 14.5523 2.44772 15 3 15H11C11.5523 15 12 14.5523 12 14V3M2 3H1M12 3H13"
          stroke={color}
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M5 2.50434V2C5 1.44772 5.44772 1 6 1H8C8.55228 1 9 1.44772 9 2V2.50434"
          stroke={color}
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path d="M4.45312 7V11" stroke={color} stroke-width="1.5" stroke-linecap="round" />
        <path d="M7 7V11" stroke={color} stroke-width="1.5" stroke-linecap="round" />
        <path d="M9.54688 7V11" stroke={color} stroke-width="1.5" stroke-linecap="round" />
      </svg>
    )
  }
)
