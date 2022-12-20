import { forwardRef } from 'react'
import { IconProps } from '../types'

export const TriangleIcon = forwardRef<SVGSVGElement, IconProps>(
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
          d="M11.347 5.007c-.446.704-7.225 12.394-7.28 12.553-.193.563.151 1.204.742 1.379C4.99 18.993 5.855 19 12 19s7.01-.007 7.191-.061c.575-.171.92-.784.754-1.343-.04-.136-1.335-2.394-3.518-6.136-2.68-4.594-3.498-5.965-3.65-6.122-.254-.26-.542-.361-.921-.322-.2.02-.277.012-.353-.038-.092-.06-.101-.059-.156.029m3.763 7.167a770.39 770.39 0 0 1 3.09 5.32c0 .014-2.79.026-6.2.026s-6.2-.012-6.2-.026c0-.04 6.177-10.614 6.2-10.614.011 0 1.41 2.383 3.11 5.294"
          fill-rule="evenodd"
          fill={color}
        />
      </svg>
    )
  }
)
