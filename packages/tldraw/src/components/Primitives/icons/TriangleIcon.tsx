import { forwardRef } from 'react'
import { IconProps } from './types'

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
          d="M11.62 5.071c-.404.133-.33.017-4.048 6.389-2.187 3.749-3.477 5.999-3.517 6.136-.166.559.179 1.172.754 1.343C4.99 18.993 5.855 19 12 19s7.01-.007 7.191-.061c.575-.171.92-.784.754-1.343-.04-.136-1.335-2.394-3.518-6.136-2.686-4.605-3.497-5.965-3.65-6.121-.311-.318-.719-.413-1.157-.268m3.49 7.103a770.39 770.39 0 0 1 3.09 5.32c0 .014-2.79.026-6.2.026s-6.2-.012-6.2-.026c0-.039 6.177-10.614 6.2-10.614.011.001 1.41 2.383 3.11 5.294"
          fill-rule="evenodd"
          fill={color}
        />
      </svg>
    )
  }
)
// export const TriangleIcon = forwardRef<SVGSVGElement, IconProps>(
//   ({ color = 'currentColor', ...props }, forwardedRef) => {
//     return (
//       <svg
//         width="16"
//         height="14"
//         viewBox="0 0 16 14"
//         fill="none"
//         xmlns="http://www.w3.org/2000/svg"
//         {...props}
//         ref={forwardedRef}
//       >
//         <path
//           d="M7.709.042a1.159 1.159 0 0 0-.541.329c-.069.078-1.48 2.467-3.528 5.976-1.877 3.216-3.451 5.92-3.498 6.01-.047.09-.1.244-.118.344-.103.566.299 1.148.877 1.269.201.042 13.997.042 14.198 0 .579-.121.98-.704.876-1.274a1.45 1.45 0 0 0-.117-.339c-.047-.089-1.621-2.794-3.498-6.01C10.314 2.842 8.901.449 8.832.371A1.135 1.135 0 0 0 7.709.042m3.404 7.139 3.1 5.312-3.107.007c-1.708.004-4.504.004-6.213 0l-3.106-.007 3.1-5.312A865.266 865.266 0 0 1 8 1.868c.007 0 1.408 2.391 3.113 5.313"
//           fill-rule="evenodd"
//           fill={color}
//         />
//       </svg>
//     )
//   }
// )
