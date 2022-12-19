import { forwardRef } from 'react'
import { IconProps } from './types'

export const HighlightIcon = forwardRef<SVGSVGElement, IconProps>(
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
        <path
          d="M3.2461 7.62699L9.55676 1.31596C10.2754 0.5973 11.4407 0.597878 12.1586 1.31725L14.7127 3.87659C15.4304 4.5957 15.4289 5.7605 14.7094 6.47777L8.41058 12.7573M3.2461 7.62699L8.41058 12.7573M3.2461 7.62699L2.03355 11.3841L0.75 12.6681L3.30299 15.2225L4.5823 13.9432L8.41058 12.7573"
          stroke={color}
          stroke-width="1.5"
          stroke-linejoin="round"
        />
      </svg>
    )
  }
)
