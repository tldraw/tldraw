import { forwardRef } from 'react'
import { IconProps } from '../types'

export const BoxIcon = forwardRef<SVGSVGElement, IconProps>(
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
          d="M4.664 4.063a1.005 1.005 0 0 0-.533.448L4.02 4.7v14.6l.111.189c.061.103.17.234.243.289.309.236-.173.222 7.624.222 8.025 0 7.379.025 7.703-.299.324-.324.299.322.299-7.701s.025-7.377-.299-7.701c-.324-.324.325-.299-7.718-.296-6.112.002-7.186.011-7.319.06M18.48 12.02v6.5H5.52v-13h12.96v6.5"
          fill={color}
          fillRule="evenodd"
        />
      </svg>
    )
  }
)
