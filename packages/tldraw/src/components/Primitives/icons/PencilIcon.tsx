import { forwardRef } from 'react'
import { IconProps } from './types'

export const PencilIcon = forwardRef<SVGSVGElement, IconProps>(
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
          d="M9.91691 2.90815L0.75 12.0753V15.2323H3.94023L13.097 6.09844M9.91691 2.90815L13.097 6.09844M9.91691 2.90815L11.4915 1.34895C12.2763 0.57175 13.5417 0.574838 14.3228 1.35586L14.6621 1.69521C15.446 2.47904 15.4459 3.74992 14.662 4.53369L13.097 6.09844"
          stroke={color}
          stroke-width="1.5"
          stroke-linejoin="round"
        />
      </svg>
    )
  }
)
