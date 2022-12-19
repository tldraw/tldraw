import { forwardRef } from 'react'
import { IconProps } from './types'

export const UndoBackIcon = forwardRef<SVGSVGElement, IconProps>(
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
          d="M8.365 6.81c-.105.057-.872.816-2.072 2.05-1.047 1.078-1.955 1.993-2.017 2.033-.133.086-.316.449-.316.627 0 .179.183.541.317.627.062.04.96.943 1.995 2.007 1.035 1.064 1.943 1.976 2.018 2.027.188.128.385.159.556.087.304-.126.594-.485.594-.734 0-.273-.183-.481-2.576-2.925l-.324-.331 4.16.013c4.085.013 4.166.015 4.505.098 1.432.353 2.338.997 2.855 2.031.24.481.37 1.012.424 1.736.048.651.1.812.306.95.241.16.703.159.95-.002.202-.132.24-.275.235-.864-.014-1.547-.585-2.929-1.6-3.877-.682-.637-1.678-1.151-2.695-1.39-.795-.186-.767-.185-5.049-.21l-4.07-.023 1.36-1.4C9.261 7.96 9.44 7.744 9.44 7.506c0-.244-.283-.605-.569-.724-.201-.084-.308-.078-.506.028"
          fill-rule="evenodd"
          fill={color}
        />
      </svg>
    )
  }
)

// export const UndoBackIcon = forwardRef<SVGSVGElement, IconProps>(
//   ({ color = 'currentColor', ...props }, forwardedRef) => {
//     return (
//       <svg
//         width="16"
//         height="12"
//         viewBox="0 0 16 12"
//         fill="none"
//         xmlns="http://www.w3.org/2000/svg"
//         {...props}
//         ref={forwardedRef}
//       >
//         <path
//           d="M4.64957 1.51611L0.751953 5.519M0.751953 5.519L4.64957 9.52139M0.751953 5.519H10.0416C11.7779 5.52923 15.2504 6.3419 15.2504 10.4844"
//           stroke={color}
//           stroke-width="1.5"
//           stroke-linecap="round"
//           stroke-linejoin="round"
//         />
//       </svg>
//     )
//   }
// )
