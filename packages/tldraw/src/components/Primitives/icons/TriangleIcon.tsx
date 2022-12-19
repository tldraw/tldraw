import { forwardRef } from 'react'
import { IconProps } from './types'

export const TriangleIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ color = 'currentColor', ...props }, forwardedRef) => {
    return (
      <svg
        width="16"
        height="14"
        viewBox="0 0 16 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M7.709.042a1.159 1.159 0 0 0-.541.329c-.069.078-1.48 2.467-3.528 5.976-1.877 3.216-3.451 5.92-3.498 6.01-.047.09-.1.244-.118.344-.103.566.299 1.148.877 1.269.201.042 13.997.042 14.198 0 .579-.121.98-.704.876-1.274a1.45 1.45 0 0 0-.117-.339c-.047-.089-1.621-2.794-3.498-6.01C10.314 2.842 8.901.449 8.832.371A1.135 1.135 0 0 0 7.709.042m3.404 7.139 3.1 5.312-3.107.007c-1.708.004-4.504.004-6.213 0l-3.106-.007 3.1-5.312A865.266 865.266 0 0 1 8 1.868c.007 0 1.408 2.391 3.113 5.313"
          fill-rule="evenodd"
          fill={color}
        />
      </svg>
    )
  }
)
